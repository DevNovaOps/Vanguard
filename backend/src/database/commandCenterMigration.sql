-- Migration script for AI Railway Command Center

USE `vanguard`;

-- ============================================================================
-- TRAINS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `trains` (
  `id`              INT            AUTO_INCREMENT PRIMARY KEY,
  `train_code`      VARCHAR(50)    NOT NULL,
  `status`          ENUM('Active','Maintenance','Idle') DEFAULT 'Active',
  `health_score`    DECIMAL(5,2)   DEFAULT 100.00,
  `location_node`   INT            DEFAULT NULL,
  `created_at`      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uq_trains_train_code` (`train_code`),
  INDEX `idx_trains_status` (`status`),
  CONSTRAINT `fk_trains_location_node` FOREIGN KEY (`location_node`) REFERENCES `railway_nodes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- WORK ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `work_orders` (
  `id`                    INT            AUTO_INCREMENT PRIMARY KEY,
  `title`                 VARCHAR(255)   NOT NULL,
  `description`           TEXT           NOT NULL,
  `node_id`               INT            DEFAULT NULL,
  `priority`              ENUM('Low','Medium','High','Critical') DEFAULT 'Medium',
  `assigned_engineer`     VARCHAR(255)   DEFAULT NULL,
  `estimated_completion`  DATETIME       DEFAULT NULL,
  `notes`                 TEXT           DEFAULT NULL,
  `attachments`           JSON           DEFAULT ('[]'),
  `resolution`            TEXT           DEFAULT NULL,
  `status`                ENUM('Open','InProgress','PendingReview','Completed','Cancelled') DEFAULT 'Open',
  `created_at`            DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_work_orders_status` (`status`),
  INDEX `idx_work_orders_priority` (`priority`),
  CONSTRAINT `fk_work_orders_node` FOREIGN KEY (`node_id`) REFERENCES `railway_nodes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- MAINTENANCE COSTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `maintenance_costs` (
  `id`          INT            AUTO_INCREMENT PRIMARY KEY,
  `type`        ENUM('Preventive','Corrective','Predictive') NOT NULL,
  `cost`        DECIMAL(12,2)  NOT NULL,
  `date`        DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `created_at`  DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_maintenance_costs_type` (`type`),
  INDEX `idx_maintenance_costs_date` (`date`)
) ENGINE=InnoDB;

-- Insert mock data for trains
INSERT IGNORE INTO `trains` (`train_code`, `status`, `health_score`) VALUES 
('Vande-Bharat-Exp-22436', 'Active', 96.50),
('Rajdhani-Exp-12951', 'Active', 88.20),
('Shatabdi-Exp-12001', 'Maintenance', 72.40),
('Duronto-Exp-12273', 'Active', 99.10),
('Garib-Rath-12215', 'Active', 82.70);

-- Insert mock data for maintenance costs
INSERT INTO `maintenance_costs` (`type`, `cost`, `date`) VALUES
('Preventive', 45000.00, DATE_SUB(NOW(), INTERVAL 30 DAY)),
('Corrective', 120000.00, DATE_SUB(NOW(), INTERVAL 20 DAY)),
('Predictive', 15000.00, DATE_SUB(NOW(), INTERVAL 10 DAY)),
('Preventive', 55000.00, DATE_SUB(NOW(), INTERVAL 5 DAY)),
('Predictive', 12000.00, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Insert mock data for work orders
INSERT INTO `work_orders` (`title`, `description`, `priority`, `assigned_engineer`, `estimated_completion`, `status`) VALUES
('Replace worn brake pads on Vande-Bharat', 'Brake pad thickness below safe threshold on coach C4.', 'High', 'Rajesh Kumar', DATE_ADD(NOW(), INTERVAL 2 DAY), 'Open'),
('Inspect track vibration sensor at Node-4', 'Sensor reporting anomalous high frequency spikes.', 'Medium', 'Anita Sharma', DATE_ADD(NOW(), INTERVAL 4 DAY), 'InProgress'),
('Routine engine diagnostics - Rajdhani', 'Scheduled monthly check for Rajdhani Exp.', 'Low', 'Vikram Singh', DATE_ADD(NOW(), INTERVAL 10 DAY), 'Open');
