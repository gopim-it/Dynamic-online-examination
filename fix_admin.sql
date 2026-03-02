UPDATE users SET password='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' WHERE email='admin@example.com';
SELECT id, email, role FROM users WHERE email='admin@example.com';
