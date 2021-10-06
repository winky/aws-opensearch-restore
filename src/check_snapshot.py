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

path = '_snapshot/?pretty'
url = host + path

def handler(event, context):
    url = f'{host}/_snapshot/?pretty'
    r = requests.get(url, auth=awsauth)

    print(f'Repository Info: {r.text}')

    url = f'{host}/_snapshot/{bucket}/_all?pretty'
    r = requests.get(url, auth=awsauth)

    print(f'Snapshot Info: {r.text}')