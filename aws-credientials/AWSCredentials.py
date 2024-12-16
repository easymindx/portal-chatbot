#!/usr/bin/python3
import profile
import sys
import boto3
import requests
import getpass
import configparser
import base64
import logging
import defusedxml.ElementTree as DT
import re
from bs4 import BeautifulSoup
from os.path import expanduser
from urllib.parse import urlparse, urlunparse
from botocore.exceptions import BotoCoreError
from botocore.exceptions import ClientError
import argparse

def parse_args():
    parser = argparse.ArgumentParser()
    # Default AWS region that this script will connect to for all API calls
    parser.add_argument('--r', dest='region', help='Region Name', default='us-east-1', type=str)
    # output format: The AWS CLI output format that will be configured in the saml profile (affects subsequent CLI calls)
    parser.add_argument('--o', dest='outputformat', help='Output format', default='json', type=str)
    # awscredfile: The file where this script will store the temp credentials under the saml profile 
    parser.add_argument('--c', dest='awscredfile', help='Credential File location', default='/.aws/credentials', type=str)
    # token: VIP Token to authenticate to ADFS
    parser.add_argument('--t', dest='token', help='VIP Token', default='', type=str)
    # username: Username to authenticate to ADFS
    parser.add_argument('--u', dest='username', help='Username', default='', type=str)
    # password: Password to authenticate to ADFS.
    parser.add_argument('--p', dest='password', help='Password', default='', type=str)
    # profile: Profile name to save the credentials
    parser.add_argument('--k', dest='profile', help='Profilename', default='default', type=str)
    return parser.parse_args()
    
args = parse_args()

# Variables
region = args.region
outputformat = args.outputformat
awscredfile = args.awscredfile
mfacode = args.token
username = 'qkp8357@qnet.qualnet.org'
password = 'Y!wRAuAjxdYQAu43!@'
profileName = args.profile

# SSL certificate verification
sslverification = True
# idp url for authentication process.
idpentryurl = 'https://sts.qualnet.org/adfs/ls/IdpInitiatedSignOn.aspx?loginToRp=urn:amazon:webservices'

#Validate Inputs
if not username:
    # Request federated credentials from the user
    print("AD domain UserId (e.g. abcd123@qnet.qualnet.org) :", end=' ')
    username = input()
if not password:
    password = getpass.getpass()
if not mfacode:
    print("VIP Token:", end=' ')
    mfacode = input()
if not profileName:
    print("Choose a profile name to save credentials to profile:", end=' ')
    profileName = input()
if not username or not password:
    print('No valid credential received')
    sys.exit(0)
if profileName.lower() == 'profile':
    print('Not a valid profile name')
    sys.exit(0)

#Solution
try:

    # Initiate session handler
    with requests.Session() as session:

        # Programmatically get the SAML assertion
        formresponse = session.get(idpentryurl, verify=sslverification)

        # Capture the idpauthformsubmiturl
        idpauthformsubmiturl = formresponse.url

        # Parse the response and extract all the necessary values
        formsoup = BeautifulSoup(formresponse.text,"html.parser")
        payload = {}
        for inputtag in formsoup.find_all(re.compile('(INPUT|input)')):
            name = inputtag.get('name','')
            value = inputtag.get('value','')
            if "user" in name.lower():
                #Make an educated guess that this is the right field for the username
                payload[name] = username
            elif "email" in name.lower():
                #Some IdPs also label the username field as 'email'
                payload[name] = username
            elif "pass" in name.lower():
                #Make an educated guess that this is the right field for the password
                payload[name] = password
            else:
                #Simply populate the parameter with the existing value (picks up hidden fields in the login form)
                payload[name] = value

        for inputtag in formsoup.find_all(re.compile('(FORM|form)')):
            action = inputtag.get('action')
            loginid = inputtag.get('id')
            if (action and loginid == "loginForm"):
                parsedurl = urlparse(idpentryurl)
                idpauthformsubmiturl = parsedurl.scheme + "://" + parsedurl.netloc + action

        # Performs the submission of the IdP login form with the above post data
        initialresponse = session.post(idpauthformsubmiturl, data=payload, verify=sslverification)

        # Overwrite and delete the credential variables
        del username
        del password

        if "Incorrect user ID or password. Type the correct user ID and password, and try again." in initialresponse.text:
            raise Exception("Incorrect user ID or password. Type the correct user ID and password, and try again.")

        # Decode the response and extract the SAML assertion
        soup = BeautifulSoup(initialresponse.text,"html.parser")
        assertion = ''
        samlresponseencoded=''
        vipauthformsubmiturl=''

        # Look for the SAMLResponse attribute of the input tag 
        for inputtag in soup.find_all('input'):
            if(inputtag.get('name') == 'SAMLResponse'):
                samlresponseencoded = inputtag.get('value')
                
        # If SAMLResponse not found then Look for the VIP AuthMethod 
        if not samlresponseencoded:
            if(soup.find('input',id='authMethod').get('value') == 'VIPAuthenticationProviderWindowsAccountName'):
                if (soup.find('input',id='vippassword')):
                    #print("VIP or MFA Token:", end=' ')
                    #mfacode = input()
                    payload['Context'] = soup.find('input',id='context').get('value')
                    payload['security_code'] = mfacode
                    
                    for inputtag in soup.find_all(re.compile('(FORM|form)')):
                        loginid = inputtag.get('id')
                        if (loginid == "loginForm"):
                            vipauthformsubmiturl = soup.find('form',id='options').get('action')
                    # Performs the submission of the IdP login form with the above post data
                    vipresponse = session.post(vipauthformsubmiturl, data=payload, verify=sslverification)

            if vipresponse:
                if "Authentication failed due to invalid security code or server error. If there are many unsuccessful login attempts, your account will be locked." in vipresponse.text:
                    print('Authentication failed due to invalid security code or server error. If there are many unsuccessful login attempts, your account will be locked.')
                    sys.exit(0)
                # Decode the response and extract the SAML assertion
                stssoup = BeautifulSoup(vipresponse.text,"html.parser")
                # Look for the SAMLResponse attribute of the input tag 
                for inputtag in stssoup.find_all('input'):
                    if(inputtag.get('name') == 'SAMLResponse'):
                        samlresponseencoded = inputtag.get('value')

        assertion = samlresponseencoded

        # Better error handling is required for production use.
        if (assertion == ''):
            raise Exception("Invalid assertions in ADFS response")

        # Parse the returned assertion and extract the authorized roles
        awsroles = []
        root = DT.fromstring(base64.b64decode(assertion))
        
        for saml2attribute in root.iter('{urn:oasis:names:tc:SAML:2.0:assertion}Attribute'):
            if (saml2attribute.get('Name') == 'https://aws.amazon.com/SAML/Attributes/Role'):
                for saml2attributevalue in saml2attribute.iter('{urn:oasis:names:tc:SAML:2.0:assertion}AttributeValue'):
                    awsroles.append(saml2attributevalue.text)

        for awsrole in awsroles:
            chunks = awsrole.split(',')
            if'saml-provider' in chunks[0]:
                newawsrole = chunks[1] + ',' + chunks[0]
                index = awsroles.index(awsrole)
                awsroles.insert(index, newawsrole)
                awsroles.remove(awsrole)

        # If More than one role, ask the user which one they want otherwise just proceed
        print("")
        if len(awsroles) > 1:
            i = 0
            print("Please choose the role you would like to assume:")
            for awsrole in awsroles:
                print('[', i, ']: ', awsrole.split(',')[0])
                i += 1
            print("Select a role : ", end=' ')
            selectedroleindex = input()

            # Basic sanity check of input
            if int(selectedroleindex) > (len(awsroles) - 1):
                print('No Roles found or Invalid choice, please try again')
                sys.exit(0)

            role_arn = awsroles[int(selectedroleindex)].split(',')[0]
            principal_arn = awsroles[int(selectedroleindex)].split(',')[1]
        else:
            role_arn = awsroles[0].split(',')[0]
            principal_arn = awsroles[0].split(',')[1]

    # Use the assertion to get an AWS STS token using Assume Role with SAML
    try:
        print(f"Selected Role: {role_arn}")
        conn = boto3.client('sts',region)
        token = conn.assume_role_with_saml(RoleArn=role_arn, PrincipalArn=principal_arn, SAMLAssertion=assertion)
    except Exception as e:
        print("Error: {}".format(e))
        raise Exception("Failure calling AWS STS service.  Likely issues: a) Outgoing internet connectivity or b) Problem with ADFS trust, claims, or role.")

    # Write the AWS STS token into the AWS credential file
    home = expanduser("~")
    filename = home + awscredfile

    # Read in the existing config file
    config = configparser.RawConfigParser()
    config.read(filename)

    # Put the credentials into a profile or the default credentials
    if not config.has_section(profileName):
        config.add_section(profileName)

    config.set(profileName, 'output', outputformat)
    config.set(profileName, 'region', region)
    config.set(profileName, 'aws_access_key_id', token['Credentials']['AccessKeyId'])
    config.set(profileName, 'aws_secret_access_key', token['Credentials']['SecretAccessKey'])
    config.set(profileName, 'aws_session_token', token['Credentials']['SessionToken'])
    print('\n----------------------------------------------------------------')
    print('Saving Credentials to {0} profile'.format(profileName))  
    # Write the updated config file
    with open(filename, 'w+') as configfile:
        config.write(configfile)
    # Output
    print('Your access key pair saved to credential file {0} under the {1} profile.'.format(filename,profileName))
    print('Note that it will expire at {0}.'.format(token['Credentials']['Expiration']))
    print(f'To use this credential, call the AWS CLI with the --profile option (e.g. aws --profile {profileName} ec2 describe-instances).')
    print('----------------------------------------------------------------\n\n')
except (KeyboardInterrupt, SystemExit):
    raise
except KeyError as e:
    print("KeyError: {}".format(e))
except (BotoCoreError, ClientError) as e:
    print("{}".format(e))
except Exception as e:
    print("{}".format(e))
