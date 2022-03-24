import * as core from "@actions/core";
import * as github from "@actions/github";

const MAX_KUBERNETES_LENGTH = 53;

function getTargetRef(requestedRef: string): string {
  if (requestedRef === '' || requestedRef === 'main') {
    return 'main'
  }
  return `ephemeral-${requestedRef}`
}

async function run() {
    try {
        const context = github.context;

        const actionVersion = getTargetRef(core.getInput("action_version", { required: false }));
        const token = core.getInput("gh_token", { required: true });
        const productName = core.getInput("product_name", { required: true });
        const helmChartValues = core.getInput("helm_chart_values", { required: false });
        const helmChartVersion = core.getInput("helm_chart_version", { required: true });
        const version = core.getInput("version", { required: true });

        const octokit = github.getOctokit(token);

        const branch = context.ref.replace("refs/heads/", "");

        if(branch.length > MAX_KUBERNETES_LENGTH) {
            console.log("Branch name is too long, max length is 53 characters");
            console.log("Not creating review environment...");
            return;
        }

        console.log("Creating deployment...");
        const deployment = await octokit.rest.repos.createDeployment({
            ...context.repo,
            ref: context.ref,
            environment: "review",
            transient_environment: true,
            auto_merge: false,
            required_contexts: [],
        });

        if(deployment.status !== 201){
            throw new Error(`Failed to create deployment: ${deployment.status}`);
        }

        console.log("Creating deployment status...");
        const deploymentStatus = await octokit.rest.repos.createDeploymentStatus({
            ...context.repo,
            deployment_id: deployment.data.id,
            state: "in_progress",
            log_url: `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}/checks`
        });

        if(deploymentStatus.status !== 201){
            throw new Error(`Failed to create deployment status: ${deploymentStatus.status}`);
        }

        const inputs =  {
            branch: branch,
            product_name: productName,
            repository_name: context.repo.repo,
            sha: context.sha,
            helm_chart_values: helmChartValues,
            deployment_id: deployment.data.id.toString(),
            helm_chart_version: helmChartVersion,
            version,
        }

        console.log("Dispatching workflow...", inputs);
        const workflowDispatch = await octokit.rest.actions.createWorkflowDispatch({
            owner: "Updater",
            repo: "kubernetes-clusters",
            workflow_id: "ephemeral_request_update.yaml",
            ref: actionVersion,
            inputs
        });

        if(workflowDispatch.status !== 204){
            throw new Error(`Failed to create workflow dispatch: ${workflowDispatch.status}`);
        }

        core.setOutput("deployment_id", deployment.data.id.toString());
    } catch (error) {
        //@ts-ignore
        core.error(error);
        //@ts-ignore
        core.setFailed(error.message);
    }
}

run();
