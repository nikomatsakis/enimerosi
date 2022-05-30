use aws_lambda_events::event::s3::{S3Event, S3EventRecord};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};

/// Maximum size of an email we will examine (1MB).
const MAX_EMAIL_SIZE: i64 = 1024 * 1024;

/// This is the main body for the function.
/// Write your code inside it.
/// There are some code example in the following URLs:
/// - https://github.com/awslabs/aws-lambda-rust-runtime/tree/main/lambda-runtime/examples
/// - https://github.com/aws-samples/serverless-rust-demo/
#[tracing::instrument(level = "debug")]
async fn process_email(event: LambdaEvent<S3Event>) -> Result<(), Error> {
    let config = aws_config::load_from_env().await;
    let s3 = aws_sdk_s3::Client::new(&config);

    for record in event.payload.records {
        match &record.event_name {
            Some(n) if n.contains("ObjectCreated") => (),
            _ => continue,
        }

        match process_event(&s3, &record).await {
            Ok(()) => {}

            Err(e) => {
                tracing::error!(
                    "Error processing new file {:?} in bucket {:?}: {:?}",
                    record.s3.object.key,
                    record.s3.bucket.name,
                    e,
                );
            }
        }
    }

    Ok(())
}

async fn process_event(s3: &aws_sdk_s3::Client, record: &S3EventRecord) -> Result<(), Error> {
    let size = record.s3.object.size.unwrap_or(0);
    if size >= MAX_EMAIL_SIZE {
        return Ok(());
    }

    tracing::debug!(
        "new file {:?} received in bucket {:?}",
        record.s3.object.key,
        record.s3.bucket.name
    );

    let (bucket, key) =
        if let (Some(bucket), Some(key)) = (&record.s3.bucket.name, &record.s3.object.key) {
            (bucket, key)
        } else {
            return Ok(());
        };

    let message_contents = s3.get_object().bucket(bucket).key(key).send().await?;
    let body = message_contents.body.collect().await?.into_bytes();
    let email = email_parser::email::Email::parse(body.as_ref())?;
    tracing::debug!("email parsed = {email:?}");

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        // disabling time is handy because CloudWatch will add the ingestion time.
        .without_time()
        .init();

    run(service_fn(process_email)).await
}
