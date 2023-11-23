# Sample Integration of Mobb with Checkmarx SAST scan in Gitlab Pipelines

This is a sample integration that demonstrates the ease of use of the Mobb CLI (Bugsy) in a CI/CD environment. By adding a single CLI command, you can introduce Mobb's autofix capability to any SAST pipelines to expedite the remediation of your security findings. In this  example, we will showcase how to add a Mobb Pipeline Stage to an existing Gitlab pipeline where a Checkmarx scan is configured to run against the branch during merge requests. 

# Usage

## Register

To perform this integration, you will need the following: 

- Sign up for a free account at https://mobb.ai
- An existing Checkmarx (CxOne) subscription
- An existing Gitlab account

## Setup 

To setup this integration in your own Gitlab environment, you will need to first generate the Mobb API Token. 

After logging into the Mobb portal, click on the "settings" icon on the bottom left, then select "Access tokens". 
From here, you can generate an API key by selecting the "Add API Key" button. 

<img src="/source/images/MobbGenerateAPI.gif" width=60% height=60%>


Next, go to your Gitlab repository and select "Settings -> CI/CD -> Variables". From here, we can select "Add Variable". For the variable key, we will call it `MOBB_API_KEY`. For the Value, we will paste the value of the Mobb token generated from the previous step. 

<img src="/source/images/Mobb_SaveVariableGitlab.gif" width=60% height=60%>

## Configure Gitlab Pipeline

Let's now configure the Gitlab Pipeline. You can use the following sample YAML script, or customize it to your liking. 

If you decide to use this exact YAML script, please ensure your Checkmarx related variables are well defined. Namely, 
`CX_BASE_AUTH_URI`, `CX_API_KEY`, `CX_BASE_URI`, `CX_TENANT`. You can find the value to these variables by following this [guide](https://checkmarx.com/resource/documents/en/34965-118315-authentication-for-checkmarx-one-cli.html) from Checkmarx documentation. 

```yaml
# This example utilizes Mobb with Checkmarx via GitLab CI/CD pipelines

image:
  name: "node:latest"

stages:
  - checkmarx-sast-scan
  - mobb-autofixer

workflow: # Run on every merge request
  rules:
    - if: $CI_PIPELINE_SOURCE == 'merge_request_event'

checkmarx-sast-scan-job:
  stage: checkmarx-sast-scan
  tags:
    - saas-linux-medium-amd64
  script:
    - wget https://github.com/Checkmarx/ast-cli/releases/download/2.0.61/ast-cli_2.0.61_linux_x64.tar.gz -O checkmarx.tar.gz
    - tar -xf checkmarx.tar.gz
    - ./cx configure set --prop-name cx_apikey --prop-value $CX_API_KEY
    - ./cx configure set --prop-name cx_base_auth_uri --prop-value $CX_BASE_AUTH_URI
    - ./cx configure set --prop-name cx_base_uri --prop-value $CX_BASE_URI
    - ./cx configure set --prop-name cx_tenant --prop-value $CX_TENANT
    - ./cx scan create --project-name "My-Sample-Project" -s ./ --report-format json --scan-types sast --branch nobranch  --threshold "sast-high=1"
  artifacts:
    paths:
    - "*.json"
    when: always

mobb-autofixer-job:
  stage: mobb-autofixer
  tags:
    - saas-linux-medium-amd64
  script:
    - npx mobbdev@latest analyze -f cx_result.json -r $CI_PROJECT_URL --ref $CI_COMMIT_REF_NAME --api-key $MOBB_API_KEY
  when: on_failure # Run Mobb only if there's a finding to fix
```
## Feeding SAST Scan results to Mobb for Analysis

This sample pipeline is configured to run on every merge_request events, or it can also be triggered manually by the user. 
For simplicity, we will trigger this pipeline manually. To do so, go to Pipeline -> Run Pipline.

<img src="/source/images/MobbPipeline_RunPipeline.png" width=60% height=60%>

This will trigger the pipeline to run the Checkmarx SAST scan. After the scan is complete, the results will automatically feed into Mobb for analysis on autofix options. 

## View Mobb Analysis for auto-fix options

After the scan is complete, Mobb will run an analysis to identify auto-fix options. The quickest way to access the analysis is through the URL from the Mobb pipeline step. To get there, let's go to Build -> Jobs, then click on the "Passed" icon next to the `Mobb-autofixer-job` stage. 

<img src="/source/images/MobbPipeline_Passed.png" width=60% height=60%>

Click on the Mobb URL to visit the analysis page. 

<img src="/source/images/MobbPipeline_URL.png" width=60% height=60%>

Once we arrive at the analysis page for the project, we can see a list of available fixes. Let's click on the "Link to Fix" button next to the XSS finding. 

<img src="/source/images/Mobb_ProjectPage.png" width=60% height=60%>

Mobb provides a powerful self-guided remediation engine. As a developer, all you have to do is answer a few questions and validate the fix that Mobb is proposing. From there, Mobb will take over the remediation process and commit the code on your behalf. 

Once you're ready, select the "Commit Changes" button. 

<img src="/source/images/Mobbmmit_CommitFix.png" width=60% height=60%>

Last the last step, enter the name of the target branch where this merge request will be merged. And select "Commit Changes". 

<img src="/source/images/Mobbmmit_CommitChanges.png" width=60% height=60%>

Mobb has successfully committed the remediated code back to your repository under a new branch along with a new merge request. Since this pipeline is configured to run on every merge_request events, a new SAST scan will be conducted to validate the proposed changes to ensure the vulnerabilities have been remediated.
