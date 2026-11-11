-- Demo leaderboard data: three fake players and their runs.
-- Safe to re-run: the demo accounts are removed first, then re-created.
-- Remove with scripts/remove-demo-data.sql.

DELETE FROM Progress
WHERE playerID IN (SELECT playerID FROM Player WHERE email LIKE '%@example.invalid');

DELETE FROM Player WHERE email LIKE '%@example.invalid';

INSERT INTO Player (email, hash, salt, username) VALUES
  ('novarunner@example.invalid', 'demo', 0, 'novarunner'),
  ('echofox@example.invalid',    'demo', 0, 'echofox'),
  ('blazejade@example.invalid',  'demo', 0, 'blazejade');

INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 6, 980, 64.2 FROM Player WHERE username = 'novarunner';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 7, 1450, 71.5 FROM Player WHERE username = 'novarunner';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 8, 1120, 88.0 FROM Player WHERE username = 'novarunner';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 9, 760, 95.4 FROM Player WHERE username = 'novarunner';

INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 6, 1230, 58.9 FROM Player WHERE username = 'echofox';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 7, 1310, 69.0 FROM Player WHERE username = 'echofox';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 8, 1680, 77.3 FROM Player WHERE username = 'echofox';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 10, 940, 101.2 FROM Player WHERE username = 'echofox';

INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 6, 870, 72.8 FROM Player WHERE username = 'blazejade';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 8, 1240, 83.6 FROM Player WHERE username = 'blazejade';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 9, 1390, 90.1 FROM Player WHERE username = 'blazejade';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 11, 610, 110.7 FROM Player WHERE username = 'blazejade';
INSERT INTO Progress (playerID, levelID, score, time)
SELECT playerID, 12, 520, 125.3 FROM Player WHERE username = 'blazejade';
