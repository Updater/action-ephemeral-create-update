# action-ephemeral-create-update
GitHub Action to create and update ephemerals

## Usage
```yaml
  - name: Deploy review environment
    uses: Updater/action-ephemeral-create-update@main
    with:
      gh_token: "${{ secrets.GH_SECRET }}" # Needs to have the `workflow` scope for the entire org.
      product_name: review-playground
      helm_chart_values: "$(cat values.yaml)" # Must be a string
      helm_chart_version: "0.1.0"
      tag: "432faddf4"
```

### Build

1. `yarn install`
2. `yarn build`

`dist/index.js` must be commited to the repo with your changes.