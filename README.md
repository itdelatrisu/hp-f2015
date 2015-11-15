# P-Auth
Pupil Authentication

We leverage [Project Oxford's](https://www.projectoxford.ai/) face recognition API to create a face authentication system that is resistent to pictures without sending video over the network.

### Server
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
