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
	`faceIdExpiration` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'the face ID expiration date',
	PRIMARY KEY (`id`)
) ENGINE=MyISAM;

--
-- Table structure for table `auth`
--
CREATE TABLE IF NOT EXISTS `auth` (
	`id` INT(11) UNSIGNED NOT NULL COMMENT 'user ID',
	`dir` ENUM('N','S','E','W') NOT NULL COMMENT 'the direction',
	`nonce` INT(11) NOT NULL COMMENT 'the nonce',
	`params` TEXT NOT NULL COMMENT 'the parameters, in JSON',
	`authExpiration` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'the expiration date',
	FOREIGN KEY (id) REFERENCES users(id)
) ENGINE=MyISAM;
