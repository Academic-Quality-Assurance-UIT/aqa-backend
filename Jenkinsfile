pipeline {
    agent any 
    environment {
        BACKEND_IMAGE = "hoanghy/aqa-backend-nestjs:latest"
        COMPOSE_FILE = "/opt/docker-compose.yml"
    }
    stages {
        stage('Checkout') {
            steps {
                // git url: 'https://github.com/aqaproject/aqa-backend-nestjs', branch: 'main' 
                checkout scm
            }
        }
        stage('Build Docker Image') {
            steps {
                echo "Building backend Docker image..."
                sh "docker build -t ${BACKEND_IMAGE} ."
            }
        }
        stage('Deploy to Server') {
            steps {
                echo "Deploying backend container..."
                sh "docker compose -f ${COMPOSE_FILE} up -d --no-deps --build backend"
            }
        }
    }
}
