# AIM_UI
This project aims to adopt [DSA](https://github.com/DigitalSlideArchive/digital_slide_archive) in chinese language as well as implement custom deep learning models developed by our lab AIM_NUIST


https://github.com/learner-codec/AIM_UI/assets/56203705/ee5da35f-6320-479a-bda0-95810abf4eb0


## Setting up development environment.
As of right now there are two stages of development. one is **girder** and another one is **HistomicsUI**. All the base functionality like widgets and task bar is derived from girder and everything related to the annotation and visualization is local to HistomicsUI. To develop the login or main user-interface can be done in girder. For more insight please consider looking at the past commits. The steps for setting up development environment are as follows.
#### 1. Mount local development folders
- In order to mount the local development folder we need to mount two folders. one for girder and another for HistomicsUI. If you follow the convention then **AIM_UI** should be placed on the same root as to **digital_slide_archive** folder. For this clone the repository on in the root where **digital_slide_archive** is. 
```git clone https://github.com/learner-codec/AIM_UI.git```
- After you clone the repo please uncomment these two lines in **docker_compose.yml** file, and modify the path as mentioned in the picture.
      <img width="383" alt="image" src="https://github.com/learner-codec/AIM_UI/assets/56203705/ed1bf722-88e0-40a4-9230-741dfb70d588">
- After that you need to restart your server for the changes to take effect. You can stop the server using this command ```docker-compose -v down``` or simply ```ctrl+c```. If the server was not running then simply run it using this command ```DSA_USER=$(id -u):$(id -g) docker-compose up```
#### 2. girder Development
- If you want to make changes to girder's source code, e.g you want to modify some core functionality you can do this by first changing the code you want to modify then
- make sure the server is running
- then enter into the docker image by using
  ```docker-compose exec girder bash```
- then ```cd /opt/digital_slide_archive/devops/dsa/utils```
- once you are into the folder simply run the following command to rebuild and restart girder.
  ```./rebuild_and_restart_girder.sh```
 - now refresh the page and you will be able to see the changes if there is no error

#### 3. HistomicsUI Development
- If you want to make changes to **HistomicsUI**. Then please do the following
  - first cd to the dsa directory by using:
    ```cd /home/aim/DSA/digital_slide_archive/devops/dsa```
  - Then simply run this command want wait for it to load all the modules:
    ```docker exec -it dsa_girder bash -lc "girder build --dev --watch-plugin histomicsui```
  - Note that this will be loaded as hotwire. Meaning you will be able to modify the source code and see changes in real time. So for UI development a good suggestion is to run it once and use it throughout the HistomicsUI development process. As in china its hard to get a succesfull load everytime due to unstable connection with github.
    
