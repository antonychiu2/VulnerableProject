# Sample Integration of Mobb with Fortify SAST scan in Gitlab Pipelines

This is a sample integration that demonstrates the ease of use of the Mobb CLI (Bugsy) in a CI/CD environment. By adding a single CLI command, you can introduce Mobb's autofix capability to any SAST pipelines to expedite the remediation of your security findings. In this  example, we will showcase how to add a Mobb Pipeline Stage to an existing Gitlab pipeline where a Fortify scan is configured to run against the branch during merge requests. 

# Usage

## Register

To perform this integration, you will need the following: 

- Sign up for a free account at https://mobb.ai
- An existing Fortify on Demand account
- An existing Gitlab account

## Setup 

To setup this integration in your own Gitlab environment, you will need to first generate the Mobb API Token. 

After logging into the Mobb portal, click on the "settings" icon on the bottom left, then select "Access tokens". 
From here, you can generate an API key by selecting the "Add API Key" button. 

<img src="/source/images/Mobb_Generate_API.gif" width=70% height=70%>


Next, go to your Gitlab repository and select "Settings -> CI/CD -> Variables". From here, we can select "Add Variable". For the variable key, we will call it `MOBB_API_KEY`. For the Value, we will paste the value of the Mobb token generated from the previous step. 

<img src="/source/images/Mobb_SaveVariableGitlab.gif" width=70% height=70%>

## Configure Gitlab Pipeline

Let's now configure the Gitlab Pipeline. You can use the following sample YAML script, or customize it to your liking. 

If you decide to use this exact YAML script, please ensure your Fortify related variables are well defined. Namely, 
`FORTIFY_USER`, `FORTIFY_TOKEN`, `FORTIFY_TENANT`, `FORTIFY_RELEASE_ID`. Refer to Fortify on Demand documentation for more details on where to obtain these values. 

```yaml
# This example utilizes Mobb with Fortify via GitLab CI/CD pipelines

image:
  name: "node:20"

stages:
  - fortify-sast-scan
  - mobb-autofixer

workflow: # Run on every merge request
  rules:
    - if: $CI_PIPELINE_SOURCE == 'merge_request_event'
    - if: $CI_PIPELINE_SOURCE == 'web'

fortify-sast-scan-job:
  stage: fortify-sast-scan
  tags:
    - saas-linux-medium-amd64
  script: |
    apt-get update 
    apt install -y openjdk-17-jre-headless maven wget unzip
    wget https://tools.fortify.com/scancentral/Fortify_ScanCentral_Client_21.2.0_x64.zip -O fcs.zip
    unzip fcs.zip
    chmod +x bin/scancentral
    ./bin/scancentral package -bt mvn -o fortify_package.zip
    wget https://github.com/fod-dev/fod-uploader-java/releases/download/v5.4.0/FodUpload.jar -O FodUpload.jar
    UPLOAD_OUTPUT=$(java -jar FodUpload.jar \
        -z fortify_package.zip \
        -ep SingleScanOnly \
        -portalurl https://ams.fortify.com/ \
        -apiurl https://api.ams.fortify.com/ \
        -userCredentials $FORTIFY_USER $FORTIFY_TOKEN \
        -tenantCode $FORTIFY_TENANT \
        -releaseId $FORTIFY_RELEASE_ID \
        -pp Queue)
    SCAN_ID=$(echo "$UPLOAD_OUTPUT" | sed -n 's/Scan \([0-9]*\).*$/\1/p')
    FORTIFY_USER=$FORTIFY_USER FORTIFY_TOKEN=$FORTIFY_TOKEN FORTIFY_TENANT=$FORTIFY_TENANT node scripts/fortify-wait-fpr.js "$SCAN_ID"
  artifacts:
    paths:
    - "*.fpr"
    when: always

mobb-autofixer-job:
  stage: mobb-autofixer
  tags:
    - saas-linux-medium-amd64
  script: 
    - npx mobbdev@latest analyze -f scandata.fpr -r $CI_PROJECT_URL --ref $CI_COMMIT_REF_NAME --api-key $MOBB_API_KEY

```
## Feeding SAST Scan results to Mobb for Analysis

This sample pipeline is configured to run on every merge_request events, or it can also be triggered manually by the user. 
For simplicity, we will trigger this pipeline manually. To do so, go to Pipeline -> Run Pipline.

<img src="/source/images/MobbPipeline_RunPipeline.png" width=70% height=70%>

This will trigger the pipeline to run a Fortify SAST scan. After the scan is complete, the results will automatically feed into Mobb for analysis on autofix options. 

## View Mobb Analysis for auto-fix options

After the scan is complete, Mobb will run an analysis to identify auto-fix options. The quickest way to access the analysis is through the URL from the Mobb pipeline step. To get there, let's go to Build -> Jobs, then click on the "Passed" icon next to the `Mobb-autofixer-job` stage. 

<img src="/source/images/MobbPipeline_Passed.png" width=70% height=70%>

Click on the Mobb URL to visit the analysis page. 

<img src="/source/images/MobbPipeline_URL.png" width=80% height=80%>

Once we arrive at the analysis page for the project, we can see a list of available fixes. Let's click on the "Link to Fix" button next to the XSS finding. 

<img src="/source/images/Mobb_ProjectPage.png" width=70% height=70%>

Mobb provides a powerful self-guided remediation engine. As a developer, all you have to do is answer a few questions and validate the fix that Mobb is proposing. From there, Mobb will take over the remediation process and commit the code on your behalf. 

Once you're ready, select the "Commit Changes" button. 

<img src="/source/images/Mobb_CommitFix.png" width=70% height=70%>

As the last step, enter the name of the target branch where this merge request will be merged. And select "Commit Changes". 

<img src="/source/images/Mobbmmit_CommitChanges.png" width=50% height=50%>

Mobb has successfully committed the remediated code back to your repository under a new branch along with a new merge request.
