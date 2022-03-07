import * as core from "@actions/core";
import * as github from "@actions/github";

const KUBERNETES_SAFE_LENGTH = 52

async function run() {
    try {
        const context = github.context;

        const token = core.getInput("gh_token", { required: true });
        const productName = dnsSafe(core.getInput("product_name", { required: true }));
        const helmChartValues = core.getInput("helm_chart_values", { required: false });
        const helmChartVersion = core.getInput("helm_chart_version", { required: true });
        const version = core.getInput("version", { required: true });

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

        // KUBERNETES_SAFE_LENGTH - 1 accounts for the `-` we add later in the process
        const branch = dnsSafe(context.ref.replace("refs/heads/", ""), (KUBERNETES_SAFE_LENGTH - 1) - productName.length);

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
                product_name: productName,
                repository_name: context.repo.repo,
                helm_chart_values: helmChartValues,
                deployment_id: deployment.data.id.toString(),
                helm_chart_version: helmChartVersion,
                version,
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

function dnsSafe(s: string, maxLength: number = KUBERNETES_SAFE_LENGTH): string{
    let regexPattern = new RegExp(`(.{0,${maxLength}}).*`);
    return s.replace(/[_\.\/']/g, '-')
        .replace(regexPattern, '$1')
        .replace(/-$/, '')
        .toLowerCase();
}

run();
