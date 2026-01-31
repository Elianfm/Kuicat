package com.kuicat.app.service;

import com.kuicat.app.entity.Setting;
import com.kuicat.app.repository.SettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Servicio para gestionar configuraciones de la aplicación.
 * Las API keys se cifran con AES-256-GCM usando una clave derivada del sistema.
 * La clave es única por PC/usuario, por lo que si se comparte la BD, las keys son inútiles.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsService {
    
    private final SettingRepository settingRepository;
    
    // Claves conocidas como sensibles
    private static final String OPENAI_API_KEY = "openai_api_key";
    private static final String REPLICATE_API_KEY = "replicate_api_key";
    
    // Configuración de cifrado
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128; // bits
    private static final int GCM_IV_LENGTH = 12;   // bytes
    private static final int KEY_LENGTH = 256;     // bits
    private static final int ITERATIONS = 65536;
    
    // Salt fijo (no es secreto, solo añade entropía)
    private static final byte[] SALT = "Kuicat2026Salt!@".getBytes();
    
    // Clave derivada (cacheada para rendimiento)
    private SecretKey derivedKey;

    /**
     * Guarda una configuración. Si es sensible, la cifra.
     */
    @Transactional
    public void saveSetting(String key, String value) {
        boolean isSensitive = isSensitiveKey(key);
        String storedValue = isSensitive ? encrypt(value) : value;
        
        Setting setting = Setting.builder()
            .key(key)
            .value(storedValue)
            .sensitive(isSensitive)
            .build();
        
        settingRepository.save(setting);
        log.info("Setting guardado: {} (sensible: {})", key, isSensitive);
    }
    
    /**
     * Obtiene una configuración. Si es sensible, la descifra.
     */
    public Optional<String> getSetting(String key) {
        return settingRepository.findById(key)
            .map(setting -> {
                if (Boolean.TRUE.equals(setting.getSensitive())) {
                    return decrypt(setting.getValue());
                }
                return setting.getValue();
            });
    }
    
    /**
     * Obtiene una configuración para mostrar en el frontend.
     * Las sensibles se muestran enmascaradas.
     */
    public Optional<String> getSettingForDisplay(String key) {
        return settingRepository.findById(key)
            .map(setting -> {
                if (Boolean.TRUE.equals(setting.getSensitive())) {
                    // Mostrar solo los últimos 4 caracteres
                    String realValue = decrypt(setting.getValue());
                    if (realValue != null && realValue.length() > 4) {
                        return "***" + realValue.substring(realValue.length() - 4);
                    }
                    return "****";
                }
                return setting.getValue();
            });
    }
    
    /**
     * Verifica si una API key está configurada y es válida (no vacía).
     */
    public boolean hasApiKey(String key) {
        return getSetting(key)
            .map(value -> value != null && !value.isBlank())
            .orElse(false);
    }
    
    /**
     * Obtiene todas las configuraciones (sensibles enmascaradas).
     */
    @Transactional(readOnly = true)
    public Map<String, String> getAllSettingsForDisplay() {
        Map<String, String> result = new HashMap<>();
        settingRepository.findAll().forEach(setting -> {
            String value;
            if (Boolean.TRUE.equals(setting.getSensitive())) {
                String realValue = decrypt(setting.getValue());
                if (realValue != null && realValue.length() > 4) {
                    value = "***" + realValue.substring(realValue.length() - 4);
                } else {
                    value = "****";
                }
            } else {
                value = setting.getValue();
            }
            result.put(setting.getKey(), value);
        });
        return result;
    }
    
    /**
     * Elimina una configuración.
     */
    @Transactional
    public void deleteSetting(String key) {
        settingRepository.deleteById(key);
        log.info("Setting eliminado: {}", key);
    }
    
    // ========== Cifrado AES-256-GCM ==========
    
    private boolean isSensitiveKey(String key) {
        return key.toLowerCase().contains("api_key") || 
               key.toLowerCase().contains("secret") ||
               key.toLowerCase().contains("password");
    }
    
    /**
     * Genera una clave AES-256 derivada de información única del sistema.
     * La clave es única por PC/usuario.
     */
    private SecretKey getDerivedKey() {
        if (derivedKey != null) {
            return derivedKey;
        }
        
        try {
            // Combinar información única del sistema
            String systemInfo = String.join("|",
                System.getProperty("user.name", "unknown"),
                System.getProperty("user.home", "unknown"),
                System.getProperty("os.name", "unknown"),
                System.getenv("COMPUTERNAME") != null ? System.getenv("COMPUTERNAME") : "unknown"
            );
            
            // Derivar clave con PBKDF2
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            KeySpec spec = new PBEKeySpec(systemInfo.toCharArray(), SALT, ITERATIONS, KEY_LENGTH);
            SecretKey tmp = factory.generateSecret(spec);
            derivedKey = new SecretKeySpec(tmp.getEncoded(), "AES");
            
            log.debug("Clave AES derivada del sistema correctamente");
            return derivedKey;
            
        } catch (Exception e) {
            log.error("Error generando clave derivada: {}", e.getMessage());
            throw new RuntimeException("Error en cifrado", e);
        }
    }
    
    /**
     * Cifra un valor con AES-256-GCM.
     * El resultado incluye el IV prepended al ciphertext.
     */
    private String encrypt(String value) {
        if (value == null || value.isEmpty()) return "";
        
        try {
            SecretKey key = getDerivedKey();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            
            // Generar IV aleatorio
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, gcmSpec);
            
            byte[] ciphertext = cipher.doFinal(value.getBytes());
            
            // Combinar IV + ciphertext
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + ciphertext.length);
            buffer.put(iv);
            buffer.put(ciphertext);
            
            return Base64.getEncoder().encodeToString(buffer.array());
            
        } catch (Exception e) {
            log.error("Error cifrando valor: {}", e.getMessage());
            return "";
        }
    }
    
    /**
     * Descifra un valor cifrado con AES-256-GCM.
     */
    private String decrypt(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isEmpty()) return "";
        
        try {
            SecretKey key = getDerivedKey();
            byte[] decoded = Base64.getDecoder().decode(encryptedValue);
            
            // Extraer IV (primeros 12 bytes)
            ByteBuffer buffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[GCM_IV_LENGTH];
            buffer.get(iv);
            
            // Extraer ciphertext (resto)
            byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);
            
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec);
            
            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext);
            
        } catch (Exception e) {
            log.error("Error descifrando valor: {}", e.getMessage());
            return "";
        }
    }
}
