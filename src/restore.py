import os
import boto3
import requests
from requests_aws4auth import AWS4Auth

host = os.environ['OPENSEARCH_HOST']
region = os.environ['REGION']
bucket = os.environ['BUCKET_NAME']
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

def handler(event, context):
    url = f'{host}/_snapshot/{bucket}/snapshot/_restore'

    r = requests.post(url, auth=awsauth)

    print(r.text)