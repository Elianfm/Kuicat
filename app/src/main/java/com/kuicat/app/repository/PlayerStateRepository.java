package com.kuicat.app.repository;

import com.kuicat.app.entity.PlayerState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayerStateRepository extends JpaRepository<PlayerState, Long> {
}
