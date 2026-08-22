-- ============================================================================
-- CONTEXT SWITCHING MIGRATION
-- Adds operational_contexts and context_snapshots tables
-- ============================================================================

USE `vanguard`;

-- ============================================================================
-- OPERATIONAL CONTEXTS
-- Each context is an isolated operational workspace (Train, Bridge, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `operational_contexts` (
  `id`          INT            AUTO_INCREMENT PRIMARY KEY,
  `user_id`     INT            NOT NULL,
  `name`        VARCHAR(100)   NOT NULL,
  `type`        ENUM('Train','Bridge','Station','Tunnel','Transformer','Track','Custom') DEFAULT 'Train',
  `icon`        VARCHAR(10)    DEFAULT '🚂',
  `color`       VARCHAR(20)    DEFAULT '#3b82f6',
  `status`      ENUM('Active','Archived') DEFAULT 'Active',
  `is_pinned`   TINYINT(1)     DEFAULT 0,
  `last_used`   DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `created_at`  DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_ctx_user` (`user_id`),
  INDEX `idx_ctx_status` (`status`),
  INDEX `idx_ctx_last_used` (`last_used`),
  CONSTRAINT `fk_ctx_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- CONTEXT SNAPSHOTS
-- Stores serialized state (JSON) per context for save/restore
-- ============================================================================
CREATE TABLE IF NOT EXISTS `context_snapshots` (
  `id`          INT            AUTO_INCREMENT PRIMARY KEY,
  `context_id`  INT            NOT NULL,
  `state_data`  JSON           NOT NULL,
  `created_at`  DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_snapshot_ctx` (`context_id`),
  CONSTRAINT `fk_snap_ctx` FOREIGN KEY (`context_id`) REFERENCES `operational_contexts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
