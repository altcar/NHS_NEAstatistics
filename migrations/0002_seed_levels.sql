-- The original site labelled level IDs 6-12 as "Level 3" to "Level 9".
-- Extra levels are created automatically the first time a score is submitted
-- for them, so this seed only keeps the original display labels.
INSERT OR IGNORE INTO Level (levelID, levelName) VALUES
  (6,  'Level 3'),
  (7,  'Level 4'),
  (8,  'Level 5'),
  (9,  'Level 6'),
  (10, 'Level 7'),
  (11, 'Level 8'),
  (12, 'Level 9');
