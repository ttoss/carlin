---
id: deploy
title: Deploy
---

Deploy resources to AWS. The basic deployment is using CloudFormation templates.

## Deploy static app

Deploy static files of web apps. The AWS resources created is mainly S3 and CloudFront.

```sh
pepe deploy static-app
```

### Options

- [`--acm-arn`](#--acm-arn)
- [`--acm-arn-exported-name`](#--acm-arn-exported-name)
- [`--aliases`](#--aliases)
- [`--buildFolder`](#--build-folder)
- [`--cloudfront`](#--cloudfront)
- [`--edge`](#--edge)
- [`--hosted-zone-name`](#--hosted-zone-name)

#### `--acm-arn`

- _type_: `string`

The ARN of the certificate that will be associated to CloudFront.

#### `--acm-arn-exported-name`

- _type_: `string`

The exported name of the ARN value of the ACM if it was created via CloudFormation.

#### `--aliases`

- _coerce_: if this options is provided, then [`--acm-arn`](#--acm-arn) or [`--acm-arn-exported-name`](#--acm-arn-exported-name) must also be provided.
- _type_: `string[]`

The aliases that will be associated with the CloudFront. [Reference](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)

#### `--cloudfront`

- _coerce_: if any of [`--acm-arn`](#--acm-arn), [`--acm-arn-exported-name`](#--acm-arn-exported-name), [`--aliases`](#--aliases) and [`--edge`](#--edge) is provided, then this option is set to `true`.
- _default_: `false`
- _type_: `boolean`

A CloudFront resource is created along with S3 if this option is `true`. The CloudFront is configured to be used with a single page application (SPA) because it index only the `index.html` file.

#### `--edge`

- _default_: `false`
- _type_: `boolean`

This option enables Lambda@Edge. This is used with apps that is built with Nextjs or Gatsby.

#### `--hosted-zone-name`

- _type_: `string`

Is the name of a Route 53 hosted zone. It `true`, Pepe creates the subdomains defined on [`--aliases`](#--aliases) option.

### Examples

Some `pepe.yml` configurations examples.

- Deploying an application only on S3 Bucket

```yaml title="pepe.yml"
- stackName: asd
```
