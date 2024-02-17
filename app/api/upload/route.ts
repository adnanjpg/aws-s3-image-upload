import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { ListObjectsCommand, S3Client } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  const { filename, contentType } = await request.json()

  try {
    const client = new S3Client({ region: process.env.AWS_REGION })
    const { url, fields } = await createPresignedPost(client, {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uuidv4(),
      Conditions: [
        ["content-length-range", 0, 10485760], // up to 10 MB
        ["starts-with", "$Content-Type", contentType],
      ],
      Fields: {
        acl: "public-read",
        "Content-Type": contentType,
      },
      Expires: 600, // Seconds before the presigned post expires. 3600 by default.
    })

    return Response.json({ url, fields })
  } catch (error) {
    return Response.json({ error: error.message })
  }
}

// when a GET request is received, we want to fetch a list of all the photos in the bucket
export async function GET() {
  const client = new S3Client({ region: process.env.AWS_REGION })
  const { Contents } = await client.send(
    new ListObjectsCommand({ Bucket: process.env.AWS_BUCKET_NAME }),
  )

  const urls = Contents.map((object) => {
    return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${object.Key}`
  })

  return Response.json(urls)
}
