import os
import boto3
import requests
from requests_aws4auth import AWS4Auth

host = os.environ['OPENSEARCH_HOST']
region = os.environ['REGION']
role_arn = os.environ['SNAPSHOT_ROLE']
bucket = os.environ['BUCKET_NAME']
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

# Register repository

def handler(evnt, context):
    url = f'{host}/_snapshot/{bucket}'
    headers = {'Content-Type': 'application/json'}
    data = {
        "type": "s3",
        "settings": {
            "bucket": bucket,
            "region": region,
            "role_arn": role_arn
        }
    }

    r = requests.put(url, auth=awsauth, json=data, headers=headers)

    print(r.status_code)
    print(r.text)