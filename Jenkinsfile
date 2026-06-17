pipeline {
    agent any
    environment {
        registry = "837577998611.dkr.ecr.us-west-2.amazonaws.com/kpi"
        ecrauth = "aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 837577998611.dkr.ecr.us-west-2.amazonaws.com"
    }

    stages {
        stage('Checkout') {
            steps {
                cleanWs()
                checkout scmGit(
                    branches: [[name: '*/fd-upgrade-fix-problems']], // temporary — revert to release branch after fd-upgrade-fix-problems is merged
                    extensions: [],
                    userRemoteConfigs: [[
                        credentialsId: 'jenkins-github-token-as-password',
                        url: 'https://github.com/gushil/kpi.git' // temporary — revert to OpenClinica/kpi after fd-upgrade-fix-problems is merged
                    ]]
                )
            }
        }

        stage('Fetch ECR Credentials') {
            steps {
                script {
                    sh "${ecrauth}"
                }
            }
        }

        stage('Build and Push Image to ECR') {
            steps {
                script {
                    sh """
                        unset DOCKER_HOST
                        if docker buildx inspect arm64builder > /dev/null 2>&1; then
                            docker buildx rm arm64builder
                        fi
                        docker buildx create --name arm64builder --node arm64 --platform linux/aarch64
                        docker buildx inspect --bootstrap --builder arm64builder
                    """
                    sh "docker buildx build --builder arm64builder --platform linux/aarch64 -t ${registry}:fd-upgrade-fix-problems --push ." // temporary — revert tag to release version after fd-upgrade-fix-problems is merged
                }
            }
        }
    }
}
