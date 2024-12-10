# Backend API

Written in Python with [FastAPI](https://fastapi.tiangolo.com/).

## Getting started

- To get started, we need to deploy resources to create DynamoDB / Bedrock resource. To deploy, please see [Deploy using CDK](../README.md#deploy-using-cdk).
- Create [poetry](https://python-poetry.org/) environment on your local machine

```sh
cd backend
python3 -m venv .venv  # Optional (If you don't want to install poetry on your env)
source .venv/bin/activate  # Optional (If you don't want to install poetry on your env)
pip install poetry
poetry install
```

## Launch local server

```sh
poetry run uvicorn app.main:app  --reload --host 0.0.0.0 --port 8000
```

- To refer the specification, access to [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) for [Swagger](https://swagger.io/) and [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc) for [Redoc](https://github.com/Redocly/redoc).
