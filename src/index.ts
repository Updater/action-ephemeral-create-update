import * as core from "@actions/core";
import * as github from "@actions/github";

async function run() {
    try {
        const context = github.context;

        const token = core.getInput("gh_token", { required: true });
        const productName = core.getInput("product_name", { required: true });
        const helmChartValues = core.getInput("helm_chart_values", { required: true });
        const helmChartVersion = core.getInput("helm_chart_version", { required: true });
        const tag = core.getInput("tag", { required: true });

        const octokit = github.getOctokit(token);

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

        const branch = dnsSafe(context.ref.split("/")[2]);

        console.log("Creating deployment status...");
        const deploymentStatus = await octokit.rest.repos.createDeploymentStatus({
            ...context.repo,
            deployment_id: deployment.data.id,
            state: "in_progress",
            log_url: `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}/checks`,
            environment_url: `https://${branch}.${productName}.review.infra.updatron.com`,
        });

        if(deploymentStatus.status !== 201){
            throw new Error(`Failed to create deployment status: ${deploymentStatus.status}`);
        }

        console.log("Dispatching workflow...");
        const workflowDispatch = await octokit.rest.actions.createWorkflowDispatch({
            owner: "Updater",
            repo: "kubernetes-clusters",
            workflow_id: "ephemeral_request_update.yaml",
            ref: "main",
            inputs: {
                branch: branch,
                sha: context.sha,
                product_name: productName,
                repository_name: context.repo.repo,
                helm_chart_values: helmChartValues,
                deployment_id: deployment.data.id.toString(),
                helm_chart_version: helmChartVersion,
                tag,
            }
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

function dnsSafe(string: string): string{
    return string.replace("_", "-").replace(".", "-");
}

run();