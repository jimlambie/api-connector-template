pipeline {
  agent {
    node {
      label 'Node'
    }
    
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
  tools {
    nodejs 'node8'
  }
}