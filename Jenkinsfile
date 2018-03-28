pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Installing..'
                sh '/usr/local/bin/npm install' 
            }
        }
        stage('Test') {
            steps {
                echo 'Testing..'
                sh '/usr/local/bin/npm test' 
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying....'
            }
        }
    }
}
