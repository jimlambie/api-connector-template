pipeline {
    agent any

    tools {
        nodejs 'node8'
    }
    
    stages {
        stage('Build') {
            steps {
                echo 'Installing..'
                sh 'npm install' 
            }
        }
        stage('Test') {
            steps {
                echo 'Testing..'
                sh 'npm test' 
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying....'
            }
        }
    }
}
