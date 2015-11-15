# MOE Auth
MOE: Orientation and Emotion Authentication

We leverage [Project Oxford's](https://www.projectoxford.ai/) emotion and face recognition APIs to create a picture-resistent non-video facial recognition authentication system.

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
