# Face Authenticator
(rename me!)

## Prerequesites
* [MySQL](https://www.mysql.com/)
* [Node.js](https://nodejs.org/)
* [Python](https://www.python.org/) (any version)

## Setup
### Server
* Run the MySQL database/table creation script.
  
  ```
  $ mysql -u root -p
  (enter your root password)
  
  mysql> source ./sql-files/main.sql;
  mysql> exit
  ```
* Install Node.js dependencies with npm.
  
  ```
  npm install
  ```
* Run the Node.js server.
  
  ```
  node app
  ```
### Client
* Serve the contents of the directory.
  
  ```
  python -m SimpleHTTPServer
  ```
* Go to http://localhost:8000/.
