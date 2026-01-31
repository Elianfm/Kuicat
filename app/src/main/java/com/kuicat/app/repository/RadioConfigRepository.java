package com.kuicat.app.repository;

import com.kuicat.app.entity.RadioConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio para la configuración del Modo Radio.
 */
@Repository
public interface RadioConfigRepository extends JpaRepository<RadioConfig, Long> {
    
    /**
     * Obtiene la configuración (singleton con id=1).
     */
    default RadioConfig getConfig() {
        return findById(1L).orElseGet(() -> {
            RadioConfig config = RadioConfig.builder().id(1L).build();
            return save(config);
        });
    }
}
