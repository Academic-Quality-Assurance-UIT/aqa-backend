pipeline {
    agent any 
    environment {
        BACKEND_IMAGE = "hoanghy/aqa-backend-nestjs:latest"
        COMPOSE_FILE = "/opt/docker-compose.yml"

        CLIENT_ID = credentials('CLIENT_ID')
        CLIENT_SECRET = credentials('CLIENT_SECRET')
        REFRESH_TOKEN = credentials('REFRESH_TOKEN')
    }
    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/aqaproject/aqa-backend-nestjs', branch: 'main'
            }
        }
        // stage('Build Docker Image') {
        //     steps {
        //         echo "Building backend Docker image..."
        //         sh "docker build -t ${BACKEND_IMAGE} ."
        //     }
        // }
        stage('Deploy to Server') {
            steps {
                echo "Deploying backend container..."
                sh "docker-compose -f ${COMPOSE_FILE} up -d --no-deps --build backend"
            }
        }
    }
}
