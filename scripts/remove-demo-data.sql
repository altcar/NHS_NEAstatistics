-- Remove the three demo players and all of their runs.
DELETE FROM Progress
WHERE playerID IN (SELECT playerID FROM Player WHERE email LIKE '%@example.invalid');

DELETE FROM Player WHERE email LIKE '%@example.invalid';
