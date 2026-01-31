package com.kuicat.app.repository;

import com.kuicat.app.entity.Setting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SettingRepository extends JpaRepository<Setting, String> {
    
    /**
     * Obtiene todas las configuraciones no sensibles.
     */
    List<Setting> findBySensitiveFalseOrSensitiveIsNull();
}
