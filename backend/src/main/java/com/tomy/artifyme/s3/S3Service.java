package com.tomy.artifyme.s3;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.util.Base64;

@Service
public class S3Service {

    @Autowired
    private S3Client s3Client;

    public UploadImageResponse uploadImage(UploadImageRequest request) {
        try {          
            // Decode the Base64-encoded image data
            System.out.println("Decoding Base64 image data...");
            String imageDataWithPrefix = request.getImage();
            String imageData = imageDataWithPrefix.substring(imageDataWithPrefix.indexOf(",") + 1);
            byte[] imageDataBytes = Base64.getDecoder().decode(imageData);

            
            // Determine the content type based on the image format
              String contentType = "";
              if (request.getImage().startsWith("data:image/png")) {
                  contentType = "png";
              } else if (request.getImage().startsWith("data:image/jpeg")) {
                  contentType = "jpeg";
              } else if (request.getImage().startsWith("data:image/gif")) {
                  contentType = "gif";
              } else if (request.getImage().startsWith("data:image/webp")) {
                  contentType = "webp";
              } else if (request.getImage().startsWith("data:image/svg+xml")) {
                  contentType = "svg+xml";
              } else {
                  throw new IllegalArgumentException("Unsupported image format");
              }

            System.out.println("Detected content type: " + contentType);

            // Create a unique filename for the image (e.g., using a timestamp)
            String filename = request.getName() + "." + contentType;

            // Create the PutObjectRequest with the image data
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket("tfr-artifyme-bucket")
                    .key(filename)
                    .contentType("image/" + contentType)
                    .build();

            // Upload the image to S3
            s3Client.putObject(putObjectRequest, RequestBody.fromByteBuffer(ByteBuffer.wrap(imageDataBytes)));
            System.out.println("Successfully uploaded Image To S3 Bucket!");
            // Construct the response object
            String imageURL = "https://s3.amazonaws.com/tfr-artifyme-bucket/" + filename;
            return UploadImageResponse.builder()
                    .message("Successfully uploaded Image To S3 Bucket!")
                    .imageURL(imageURL)
                    .filename(filename)
                    .build();
        } catch (Exception e) {
            // Handle any exceptions
            e.printStackTrace();
            return UploadImageResponse.builder()
                    .message("Error uploading Image to S3")
                    .build();
        }
    }

    public GetImageResponse getImage(GetImageRequest request) {
        try {
            // Define the parameters for getObject
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket("tfr-artifyme-bucket")
                    .key(request.getKey())
                    .build();
    
            // Retrieve the image from S3
            ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getObjectRequest);
    
            // Read the image data from the S3 response body
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int len;
            while ((len = response.read(buffer)) != -1) {
                outputStream.write(buffer, 0, len);
            }
    
            // Convert the image data to Base64
            byte[] imageData = outputStream.toByteArray();
            String base64Image = Base64.getEncoder().encodeToString(imageData);
    
            // Extract file extension from the filename
            String filename = request.getKey();
            String[] parts = filename.split("\\.");
            String extension = parts[parts.length - 1];
    
            // Determine content type based on file extension
            String contentType;
            switch (extension.toLowerCase()) {
                case "png":
                    contentType = "image/png";
                    break;
                case "jpg":
                case "jpeg":
                    contentType = "image/jpeg";
                    break;
                case "gif":
                    contentType = "image/gif";
                    break;
                case "webp":
                    contentType = "image/webp";
                    break;
                case "svg":
                    contentType = "image/svg+xml";
                    break;
                default:
                    throw new IllegalArgumentException("Unsupported file extension");
            }
    
            // Print success message
            System.out.println("Successfully retrieved image from S3.");
    
            return GetImageResponse.builder()
                    .base64ImageData(base64Image)
                    .contentType(contentType)
                    .build();
        } catch (Exception e) {
            // Handle any exceptions
            e.printStackTrace();
            return GetImageResponse.builder().build(); // or return null
        }
    }
    
}
