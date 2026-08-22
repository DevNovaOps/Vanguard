-- ============================================================================
-- VANGUARD — Seed Data for MySQL
-- Compliance rules only (users, nodes, connections, incidents seeded via JS)
-- ============================================================================

USE `vanguard`;

-- ============================================================================
-- COMPLIANCE RULES
-- ============================================================================
INSERT IGNORE INTO `compliance_rules` (`rule_code`, `standard`, `sensor_type`, `min_value`, `max_value`, `severity`, `description`, `is_active`)
VALUES
  ('API617-TEMP', 'API 617', 'Temperature', 0, 120, 'High', 'Centrifugal compressor temperature compliance thresholds according to the API 617 engineering standards.', 1),
  ('RDSO-SPEC', 'RDSO', 'Vibration', 0, 15, 'Critical', 'Vibration tolerances for locomotive chassis structure per RDSO compliance specifications.', 1),
  ('IEC-61850', 'IEC 61850', 'Voltage', 220, 240, 'Medium', 'Voltage deviation limits for power utility automation equipment defined under standard IEC-61850.', 1),
  ('UIC-714', 'UIC 714', 'Pressure', 2, 8, 'Critical', 'Pneumatic braking system pressure boundaries for rolling stock compliance standard UIC 714.', 1);
