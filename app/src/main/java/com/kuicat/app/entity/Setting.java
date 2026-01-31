package com.kuicat.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entidad para almacenar configuraciones de la aplicación.
 * Las claves sensibles (API keys) se guardan ofuscadas.
 */
@Entity
@Table(name = "settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Setting {
    
    @Id
    @Column(name = "setting_key", length = 100)
    private String key;
    
    @Column(name = "setting_value", length = 1000)
    private String value;
    
    @Column(name = "is_sensitive")
    private Boolean sensitive;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
