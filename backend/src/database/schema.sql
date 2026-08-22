-- ============================================================================
-- VANGUARD — AI-Powered Predictive Railway Maintenance Platform
-- Complete MySQL Schema (mysql2/promise)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `vanguard`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `vanguard`;

-- ============================================================================
-- 1. USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`                    INT            AUTO_INCREMENT PRIMARY KEY,
  `name`                  VARCHAR(255)   NOT NULL,
  `email`                 VARCHAR(255)   NOT NULL,
  `password`              VARCHAR(255)   NOT NULL,
  `role`                  ENUM('Admin','Operator','SafetyOfficer','Manager') NOT NULL,
  `permissions`           JSON           DEFAULT ('[]'),
  `department`            VARCHAR(255)   DEFAULT 'General Operations',
  `is_active`             TINYINT(1)     DEFAULT 0,
  `phone`                 VARCHAR(20)    DEFAULT NULL,
  `last_login`            DATETIME       DEFAULT NULL,
  `reset_password_token`  VARCHAR(255)   DEFAULT NULL,
  `reset_password_expire` DATETIME       DEFAULT NULL,
  `login_otp`             VARCHAR(10)    DEFAULT NULL,
  `login_otp_expire`      DATETIME       DEFAULT NULL,
  `otp_attempts`          INT            DEFAULT 0,
  `otp_locked_until`      DATETIME       DEFAULT NULL,
  `created_at`            DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_users_email` (`email`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. RAILWAY NODES
-- ============================================================================
CREATE TABLE IF NOT EXISTS `railway_nodes` (
  `id`          INT            AUTO_INCREMENT PRIMARY KEY,
  `node_code`   VARCHAR(20)    NOT NULL,
  `node_name`   VARCHAR(255)   NOT NULL,
  `node_type`   ENUM('Station','Junction','Depot','PowerHub','SignalTower') NOT NULL,
  `latitude`    DECIMAL(10,6)  NOT NULL,
  `longitude`   DECIMAL(10,6)  NOT NULL,
  `status`      VARCHAR(20)    DEFAULT 'Active',
  `region`      VARCHAR(100)   NOT NULL,
  `created_at`  DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_railway_nodes_code` (`node_code`),
  INDEX `idx_railway_nodes_status` (`status`),
  INDEX `idx_railway_nodes_region` (`region`),
  INDEX `idx_railway_nodes_type` (`node_type`)
) ENGINE=InnoDB;

-- ============================================================================
-- 3. RAILWAY CONNECTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `railway_connections` (
  `id`              INT            AUTO_INCREMENT PRIMARY KEY,
  `source_node_id`  INT            NOT NULL,
  `target_node_id`  INT            NOT NULL,
  `distance`        DECIMAL(10,1)  NOT NULL,
  `status`          VARCHAR(20)    DEFAULT 'Active',
  `created_at`      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_connections_pair` (`source_node_id`, `target_node_id`),
  INDEX `idx_connections_status` (`status`),
  CONSTRAINT `fk_connections_source` FOREIGN KEY (`source_node_id`) REFERENCES `railway_nodes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_connections_target` FOREIGN KEY (`target_node_id`) REFERENCES `railway_nodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 4. TRANSIT NODES
-- ============================================================================
CREATE TABLE IF NOT EXISTS `transit_nodes` (
  `id`           INT            AUTO_INCREMENT PRIMARY KEY,
  `name`         VARCHAR(255)   NOT NULL,
  `node_code`    VARCHAR(20)    NOT NULL,
  `node_type`    ENUM('Station','Depot','Junction','PowerHub') NOT NULL,
  `latitude`     DECIMAL(10,6)  NOT NULL,
  `longitude`    DECIMAL(10,6)  NOT NULL,
  `status`       ENUM('Active','Inactive','Maintenance') DEFAULT 'Active',
  `description`  TEXT           DEFAULT NULL,
  `created_by`   INT            NOT NULL,
  `created_at`   DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_transit_nodes_code` (`node_code`),
  INDEX `idx_transit_nodes_status` (`status`),
  CONSTRAINT `fk_transit_nodes_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 5. SENSORS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `sensors` (
  `id`                     INT            AUTO_INCREMENT PRIMARY KEY,
  `sensor_name`            VARCHAR(255)   NOT NULL,
  `sensor_code`            VARCHAR(50)    NOT NULL,
  `sensor_type`            ENUM('Temperature','Vibration','Pressure','Gas','Humidity','Smoke','Voltage','Current') NOT NULL,
  `node_id`                INT            NOT NULL,
  `threshold`              DECIMAL(10,2)  NOT NULL,
  `unit`                   VARCHAR(30)    NOT NULL,
  `status`                 ENUM('Online','Offline','Faulty') DEFAULT 'Online',
  `installation_date`      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `last_calibration_date`  DATETIME       DEFAULT NULL,
  `created_at`             DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_sensors_code` (`sensor_code`),
  INDEX `idx_sensors_type` (`sensor_type`),
  INDEX `idx_sensors_status` (`status`),
  INDEX `idx_sensors_node` (`node_id`),
  CONSTRAINT `fk_sensors_node` FOREIGN KEY (`node_id`) REFERENCES `transit_nodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 6. SENSOR DATA (Telemetry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `sensor_data` (
  `id`            INT            AUTO_INCREMENT PRIMARY KEY,
  `sensor_id`     INT            NOT NULL,
  `value`         DECIMAL(12,4)  NOT NULL,
  `risk_score`    DECIMAL(5,2)   DEFAULT 0,
  `is_violation`  TINYINT(1)     DEFAULT 0,
  `reading_time`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`    DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_sensor_data_sensor_time` (`sensor_id`, `reading_time` DESC),
  INDEX `idx_sensor_data_violation` (`is_violation`),
  CONSTRAINT `fk_sensor_data_sensor` FOREIGN KEY (`sensor_id`) REFERENCES `sensors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 7. COMPLIANCE RULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS `compliance_rules` (
  `id`           INT            AUTO_INCREMENT PRIMARY KEY,
  `rule_code`    VARCHAR(30)    NOT NULL,
  `standard`     VARCHAR(100)   NOT NULL,
  `sensor_type`  ENUM('Temperature','Vibration','Pressure','Gas','Humidity','Smoke','Voltage','Current') NOT NULL,
  `min_value`    DECIMAL(10,2)  DEFAULT NULL,
  `max_value`    DECIMAL(10,2)  DEFAULT NULL,
  `severity`     ENUM('Low','Medium','High','Critical') NOT NULL,
  `description`  TEXT           DEFAULT NULL,
  `is_active`    TINYINT(1)     DEFAULT 1,
  `created_at`   DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_compliance_rules_code` (`rule_code`),
  INDEX `idx_compliance_rules_standard` (`standard`),
  INDEX `idx_compliance_rules_sensor_type` (`sensor_type`),
  INDEX `idx_compliance_rules_active` (`is_active`)
) ENGINE=InnoDB;

-- ============================================================================
-- 8. COMPLIANCE VIOLATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `compliance_violations` (
  `id`              INT            AUTO_INCREMENT PRIMARY KEY,
  `rule_id`         INT            NOT NULL,
  `node_id`         INT            NOT NULL,
  `sensor_type`     ENUM('Temperature','Vibration','Pressure','Gas','Humidity','Smoke','Voltage','Current') NOT NULL,
  `actual_value`    DECIMAL(10,2)  NOT NULL,
  `expected_value`  DECIMAL(10,2)  NOT NULL,
  `severity`        ENUM('Low','Medium','High','Critical') NOT NULL,
  `status`          ENUM('Open','Resolved','Investigating') DEFAULT 'Open',
  `created_at`      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_violations_rule` (`rule_id`),
  INDEX `idx_violations_node` (`node_id`),
  INDEX `idx_violations_sensor_type` (`sensor_type`),
  INDEX `idx_violations_severity` (`severity`),
  INDEX `idx_violations_status` (`status`),
  INDEX `idx_violations_node_status` (`node_id`, `status`),
  INDEX `idx_violations_created` (`created_at` DESC),
  CONSTRAINT `fk_violations_rule` FOREIGN KEY (`rule_id`) REFERENCES `compliance_rules`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_violations_node` FOREIGN KEY (`node_id`) REFERENCES `railway_nodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 9. RISK SCORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS `risk_scores` (
  `id`               INT            AUTO_INCREMENT PRIMARY KEY,
  `node_id`          INT            NOT NULL,
  `thermal_risk`     DECIMAL(5,2)   DEFAULT 0,
  `electrical_risk`  DECIMAL(5,2)   DEFAULT 0,
  `structural_risk`  DECIMAL(5,2)   DEFAULT 0,
  `mechanical_risk`  DECIMAL(5,2)   DEFAULT 0,
  `signaling_risk`   DECIMAL(5,2)   DEFAULT 0,
  `total_risk`       DECIMAL(5,2)   DEFAULT 0,
  `risk_level`       ENUM('Low','Medium','High','Critical') DEFAULT 'Low',
  `calculated_at`    DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `created_at`       DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_risk_scores_node` (`node_id`),
  INDEX `idx_risk_scores_level` (`risk_level`),
  CONSTRAINT `fk_risk_scores_node` FOREIGN KEY (`node_id`) REFERENCES `railway_nodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 10. INCIDENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `incidents` (
  `id`             INT            AUTO_INCREMENT PRIMARY KEY,
  `incident_id`    VARCHAR(50)    NOT NULL,
  `node_id`        INT            NOT NULL,
  `risk_score`     DECIMAL(5,2)   NOT NULL,
  `severity`       ENUM('Low','Medium','High','Critical') NOT NULL,
  `title`          VARCHAR(500)   NOT NULL,
  `description`    TEXT           NOT NULL,
  `status`         ENUM('Open','Investigating','Mitigating','Resolved','Closed') DEFAULT 'Open',
  `assigned_team`  VARCHAR(100)   DEFAULT NULL,
  `source`         ENUM('Telemetry','Compliance','Simulation','Manual','Agent') NOT NULL,
  `created_at`     DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_incidents_incident_id` (`incident_id`),
  INDEX `idx_incidents_node` (`node_id`),
  INDEX `idx_incidents_severity` (`severity`),
  INDEX `idx_incidents_status` (`status`),
  INDEX `idx_incidents_source` (`source`),
  INDEX `idx_incidents_created` (`created_at` DESC),
  CONSTRAINT `fk_incidents_node` FOREIGN KEY (`node_id`) REFERENCES `railway_nodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 11. AGENT ACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `agent_actions` (
  `id`               INT            AUTO_INCREMENT PRIMARY KEY,
  `node_id`          INT            NOT NULL,
  `incident_id`      INT            DEFAULT NULL,
  `telemetry_data`   JSON           NOT NULL,
  `detected_threat`  VARCHAR(500)   NOT NULL,
  `severity`         ENUM('Low','Medium','High','Critical') NOT NULL,
  `decision`         TEXT           NOT NULL,
  `confidence`       DECIMAL(5,2)   NOT NULL,
  `reasoning`        TEXT           NOT NULL,
  `status`           ENUM('success','pending','failed') DEFAULT 'success',
  `executed_at`      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `created_at`       DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_agent_actions_node` (`node_id`),
  INDEX `idx_agent_actions_incident` (`incident_id`),
  INDEX `idx_agent_actions_severity` (`severity`),
  INDEX `idx_agent_actions_status` (`status`),
  INDEX `idx_agent_actions_node_created` (`node_id`, `created_at` DESC),
  INDEX `idx_agent_actions_created` (`created_at` DESC),
  CONSTRAINT `fk_agent_actions_node` FOREIGN KEY (`node_id`) REFERENCES `railway_nodes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_agent_actions_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 12. MITIGATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `mitigations` (
  `id`                INT            AUTO_INCREMENT PRIMARY KEY,
  `mitigation_id`     VARCHAR(50)    NOT NULL,
  `incident_id`       INT            NOT NULL,
  `node_id`           INT            NOT NULL,
  `action`            VARCHAR(100)   NOT NULL,
  `type`              VARCHAR(100)   NOT NULL,
  `severity`          ENUM('Low','Medium','High','Critical') NOT NULL,
  `status`            ENUM('Pending','InProgress','Executed','Completed','Failed','Cancelled') DEFAULT 'Pending',
  `executed_by`       INT            DEFAULT NULL,
  `execution_source`  ENUM('AI_AGENT','OPERATOR','SAFETY_OFFICER','ADMIN') NOT NULL,
  `execution_notes`   TEXT           DEFAULT NULL,
  `started_at`        DATETIME       DEFAULT NULL,
  `completed_at`      DATETIME       DEFAULT NULL,
  `executed_at`       DATETIME       DEFAULT NULL,
  `agent_action_id`   INT            DEFAULT NULL,
  `created_at`        DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_mitigations_mitigation_id` (`mitigation_id`),
  INDEX `idx_mitigations_incident` (`incident_id`),
  INDEX `idx_mitigations_node` (`node_id`),
  INDEX `idx_mitigations_action` (`action`),
  INDEX `idx_mitigations_type` (`type`),
  INDEX `idx_mitigations_severity` (`severity`),
  INDEX `idx_mitigations_status` (`status`),
  INDEX `idx_mitigations_executed_by` (`executed_by`),
  INDEX `idx_mitigations_execution_source` (`execution_source`),
  INDEX `idx_mitigations_agent_action` (`agent_action_id`),
  CONSTRAINT `fk_mitigations_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mitigations_node` FOREIGN KEY (`node_id`) REFERENCES `railway_nodes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mitigations_user` FOREIGN KEY (`executed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mitigations_agent_action` FOREIGN KEY (`agent_action_id`) REFERENCES `agent_actions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 13. SIMULATION RUNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `simulation_runs` (
  `id`               INT            AUTO_INCREMENT PRIMARY KEY,
  `run_id`           VARCHAR(50)    NOT NULL,
  `status`           ENUM('Running','Completed','Failed','Cancelled') DEFAULT 'Running',
  `triggered_by`     INT            DEFAULT NULL,
  `node_id`          INT            DEFAULT NULL,
  `total_steps`      INT            DEFAULT 7,
  `completed_steps`  INT            DEFAULT 0,
  `current_step`     INT            DEFAULT 0,
  `started_at`       DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `completed_at`     DATETIME       DEFAULT NULL,
  `result`           JSON           DEFAULT NULL,
  `error_message`    TEXT           DEFAULT NULL,
  `created_at`       DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_simulation_runs_run_id` (`run_id`),
  INDEX `idx_simulation_runs_status` (`status`),
  CONSTRAINT `fk_simulation_runs_user` FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_simulation_runs_node` FOREIGN KEY (`node_id`) REFERENCES `railway_nodes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 14. SIMULATION RESULTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `simulation_results` (
  `id`                    INT            AUTO_INCREMENT PRIMARY KEY,
  `simulation_id`         VARCHAR(50)    NOT NULL,
  `asset_id`              VARCHAR(50)    NOT NULL,
  `asset_type`            VARCHAR(50)    NOT NULL,
  `location`              VARCHAR(255)   NOT NULL,
  `failure_type`          VARCHAR(100)   NOT NULL,
  `query`                 TEXT           NOT NULL,
  `retrieval_results`     TEXT           DEFAULT NULL,
  `sensor_evidence`       TEXT           DEFAULT NULL,
  `historical_incidents`  TEXT           DEFAULT NULL,
  `rdso_guidance`         TEXT           DEFAULT NULL,
  `root_causes`           TEXT           DEFAULT NULL,
  `mitigation_actions`    TEXT           DEFAULT NULL,
  `executive_summary`     TEXT           DEFAULT NULL,
  `risk_level`            VARCHAR(20)    DEFAULT 'LOW',
  `result_created_at`     DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `created_at`            DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_simulation_results_sim_id` (`simulation_id`),
  INDEX `idx_simulation_results_risk` (`risk_level`)
) ENGINE=InnoDB;

-- ============================================================================
-- 15. SIMULATION EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `simulation_events` (
  `id`            INT            AUTO_INCREMENT PRIMARY KEY,
  `run_id`        INT            NOT NULL,
  `step_number`   INT            NOT NULL,
  `step_name`     VARCHAR(255)   NOT NULL,
  `module`        VARCHAR(100)   NOT NULL,
  `status`        ENUM('pending','running','completed','failed') DEFAULT 'pending',
  `description`   TEXT           DEFAULT NULL,
  `data`          JSON           DEFAULT NULL,
  `started_at`    DATETIME       DEFAULT NULL,
  `completed_at`  DATETIME       DEFAULT NULL,
  `duration`      INT            DEFAULT 0,
  `created_at`    DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_simulation_events_run` (`run_id`),
  CONSTRAINT `fk_simulation_events_run` FOREIGN KEY (`run_id`) REFERENCES `simulation_runs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 16. ROUTE SEGMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `route_segments` (
  `id`            INT            AUTO_INCREMENT PRIMARY KEY,
  `route_code`    VARCHAR(30)    NOT NULL,
  `route_name`    VARCHAR(255)   NOT NULL,
  `source_node`   INT            NOT NULL,
  `target_node`   INT            NOT NULL,
  `distance`      DECIMAL(10,1)  NOT NULL,
  `coordinates`   JSON           NOT NULL,
  `status`        VARCHAR(20)    DEFAULT 'Active',
  `region`        VARCHAR(100)   NOT NULL,
  `tier`          ENUM('major','regional','local') DEFAULT 'local',
  `corridor_id`   VARCHAR(50)    DEFAULT NULL,
  `load_pct`      DECIMAL(5,2)   DEFAULT 50,
  `created_at`    DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_route_segments_code` (`route_code`),
  INDEX `idx_route_segments_status` (`status`),
  INDEX `idx_route_segments_region` (`region`),
  INDEX `idx_route_segments_tier` (`tier`),
  INDEX `idx_route_segments_corridor` (`corridor_id`),
  CONSTRAINT `fk_route_segments_source` FOREIGN KEY (`source_node`) REFERENCES `railway_nodes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_route_segments_target` FOREIGN KEY (`target_node`) REFERENCES `railway_nodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 17. WEBHOOKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `webhooks` (
  `id`                   INT            AUTO_INCREMENT PRIMARY KEY,
  `webhook_id`           VARCHAR(20)    NOT NULL,
  `name`                 VARCHAR(255)   NOT NULL,
  `description`          TEXT           DEFAULT NULL,
  `endpoint`             VARCHAR(500)   NOT NULL,
  `method`               ENUM('GET','POST','PUT','PATCH') DEFAULT 'POST',
  `headers`              JSON           DEFAULT ('{}'),
  `subscribed_events`    JSON           DEFAULT ('[]'),
  `is_active`            TINYINT(1)     DEFAULT 1,
  `status`               ENUM('Active','Inactive','Error') DEFAULT 'Active',
  `total_requests`       INT            DEFAULT 0,
  `successful_requests`  INT            DEFAULT 0,
  `failed_requests`      INT            DEFAULT 0,
  `success_rate`         DECIMAL(5,2)   DEFAULT 100,
  `average_latency`      DECIMAL(10,2)  DEFAULT 0,
  `last_triggered_at`    DATETIME       DEFAULT NULL,
  `last_response_code`   INT            DEFAULT NULL,
  `created_by`           INT            DEFAULT NULL,
  `created_at`           DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_webhooks_webhook_id` (`webhook_id`),
  INDEX `idx_webhooks_active` (`is_active`),
  INDEX `idx_webhooks_status` (`status`),
  CONSTRAINT `fk_webhooks_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 18. WEBHOOK DELIVERIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS `webhook_deliveries` (
  `id`              INT            AUTO_INCREMENT PRIMARY KEY,
  `delivery_id`     VARCHAR(20)    NOT NULL,
  `webhook_id`      VARCHAR(20)    NOT NULL,
  `event_type`      VARCHAR(100)   NOT NULL,
  `payload`         JSON           NOT NULL,
  `response_code`   INT            DEFAULT NULL,
  `response_body`   TEXT           DEFAULT NULL,
  `latency`         INT            DEFAULT 0,
  `status`          ENUM('Success','Failed','Retrying') NOT NULL,
  `retry_count`     INT            DEFAULT 0,
  `timestamp`       DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `created_at`      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_webhook_deliveries_delivery_id` (`delivery_id`),
  INDEX `idx_webhook_deliveries_webhook` (`webhook_id`),
  INDEX `idx_webhook_deliveries_event` (`event_type`),
  INDEX `idx_webhook_deliveries_timestamp` (`timestamp` DESC)
) ENGINE=InnoDB;

-- ============================================================================
-- 19. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`                INT            AUTO_INCREMENT PRIMARY KEY,
  `notification_id`   VARCHAR(20)    NOT NULL,
  `title`             VARCHAR(500)   NOT NULL,
  `message`           TEXT           NOT NULL,
  `type`              VARCHAR(50)    NOT NULL,
  `severity`          ENUM('Info','Warning','High','Critical') NOT NULL,
  `module`            VARCHAR(50)    NOT NULL,
  `recipient_roles`   JSON           DEFAULT ('[]'),
  `metadata`          JSON           DEFAULT ('{}'),
  `created_at`        DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_notifications_notification_id` (`notification_id`),
  INDEX `idx_notifications_type` (`type`),
  INDEX `idx_notifications_severity` (`severity`),
  INDEX `idx_notifications_module` (`module`),
  INDEX `idx_notifications_created` (`created_at` DESC)
) ENGINE=InnoDB;

-- Junction table for notification recipients
CREATE TABLE IF NOT EXISTS `notification_recipients` (
  `id`               INT  AUTO_INCREMENT PRIMARY KEY,
  `notification_id`  INT  NOT NULL,
  `user_id`          INT  NOT NULL,

  UNIQUE KEY `uq_notif_recipient` (`notification_id`, `user_id`),
  CONSTRAINT `fk_notif_recip_notif` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_recip_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Junction table for notification read status
CREATE TABLE IF NOT EXISTS `notification_reads` (
  `id`               INT       AUTO_INCREMENT PRIMARY KEY,
  `notification_id`  INT       NOT NULL,
  `user_id`          INT       NOT NULL,
  `read_at`          DATETIME  DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_notif_read` (`notification_id`, `user_id`),
  CONSTRAINT `fk_notif_read_notif` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_read_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 20. AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`           INT            AUTO_INCREMENT PRIMARY KEY,
  `audit_id`     VARCHAR(20)    NOT NULL,
  `user_id`      INT            DEFAULT NULL,
  `username`     VARCHAR(255)   DEFAULT 'System',
  `role`         VARCHAR(50)    DEFAULT 'System',
  `action`       VARCHAR(100)   NOT NULL,
  `module`       VARCHAR(50)    NOT NULL,
  `entity_type`  VARCHAR(100)   DEFAULT NULL,
  `entity_id`    VARCHAR(100)   DEFAULT NULL,
  `description`  TEXT           NOT NULL,
  `severity`     ENUM('Info','Warning','Critical') NOT NULL,
  `metadata`     JSON           DEFAULT ('{}'),
  `ip_address`   VARCHAR(45)    DEFAULT NULL,
  `user_agent`   TEXT           DEFAULT NULL,
  `timestamp`    DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `created_at`   DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_audit_logs_audit_id` (`audit_id`),
  INDEX `idx_audit_logs_user` (`user_id`),
  INDEX `idx_audit_logs_action` (`action`),
  INDEX `idx_audit_logs_module` (`module`),
  INDEX `idx_audit_logs_severity` (`severity`),
  INDEX `idx_audit_logs_timestamp` (`timestamp` DESC),
  INDEX `idx_audit_logs_created` (`created_at` DESC)
) ENGINE=InnoDB;
