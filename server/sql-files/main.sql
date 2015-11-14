CREATE DATABASE IF NOT EXISTS `face`;
CREATE USER 'face'@'localhost' IDENTIFIED BY 'password';
USE `face`;
GRANT ALL ON `face`.* TO 'face'@'localhost';

--
-- Table structure for table `users`
--
CREATE TABLE IF NOT EXISTS `users` (
	`id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'unique auto-incrementing numeric ID assigned to each new user',
	`username` VARCHAR(32) NOT NULL UNIQUE COMMENT 'unique identifier created by the user',
	`faceId` TEXT NOT NULL COMMENT 'face ID',
	`expiration` TIMESTAMP NOT NULL COMMENT 'the face ID expiration date',
	PRIMARY KEY (`id`)
) ENGINE=MyISAM;
