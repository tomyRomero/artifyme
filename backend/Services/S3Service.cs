using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Net.Mime;
using System.Collections.Generic;
using ArtifyMe.Models.DTOs;
using ArtifyMe.Services.Interfaces;

namespace ArtifyMe.Services;

    public class S3Service : IS3Service
    {
        private readonly IAmazonS3 _s3Client;

        public S3Service(IAmazonS3 s3Client)
        {
            _s3Client = s3Client;
        }

        public async Task<UploadImageResponse> UploadImage(UploadImageRequest request)
        {
            try
            {
                // Decode the Base64-encoded image data
                string imageDataWithPrefix = request.Image;
                string imageData = imageDataWithPrefix.Substring(imageDataWithPrefix.IndexOf(",") + 1);
                byte[] imageDataBytes = Convert.FromBase64String(imageData);

                // Determine the content type based on the image format
                string contentType;
                if (request.Image.StartsWith("data:image/png"))
                    contentType = "png";
                else if (request.Image.StartsWith("data:image/jpeg"))
                    contentType = "jpeg";
                else if (request.Image.StartsWith("data:image/gif"))
                    contentType = "gif";
                else if (request.Image.StartsWith("data:image/webp"))
                    contentType = "webp";
                else if (request.Image.StartsWith("data:image/svg+xml"))
                    contentType = "svg+xml";
                else
                    throw new ArgumentException("Unsupported image format");

                // Create a unique filename for the image
                string filename = $"{request.Name}.{contentType}";

                // Upload the image to S3
                var putRequest = new PutObjectRequest
                {
                    BucketName = "tfr-artifyme-bucket",
                    Key = filename,
                    ContentType = $"image/{contentType}",
                    InputStream = new MemoryStream(imageDataBytes)
                };

                await _s3Client.PutObjectAsync(putRequest);

                // Construct the response object
                string imageURL = $"https://{putRequest.BucketName}.s3.amazonaws.com/{putRequest.Key}";
                return new UploadImageResponse
                {
                    Message = "Successfully uploaded Image To S3 Bucket!",
                    ImageURL = imageURL,
                    Filename = filename
                };
            }
            catch (Exception e)
            {
                // Handle any exceptions
                Console.WriteLine(e.Message);
                return new UploadImageResponse
                {
                    Message = "Error uploading Image to S3"
                };
            }
        }

        public async Task<GetImageResponse> GetImage(GetImageRequest request)
        {
            try
            {
                // Retrieve the image from S3
                var getRequest = new GetObjectRequest
                {
                    BucketName = "tfr-artifyme-bucket",
                    Key = request.Key
                };

                using (var response = await _s3Client.GetObjectAsync(getRequest))
                using (var memoryStream = new MemoryStream())
                {
                    await response.ResponseStream.CopyToAsync(memoryStream);

                    byte[] imageData = memoryStream.ToArray();
                    string base64Image = Convert.ToBase64String(imageData);

                    // Extract file extension from the filename
                    string extension = Path.GetExtension(request.Key).TrimStart('.').ToLower();

                    // Determine content type based on file extension
                    string contentType = extension switch
                    {
                        "png" => "image/png",
                        "jpg" or "jpeg" => "image/jpeg",
                        "gif" => "image/gif",
                        "webp" => "image/webp",
                        "svg" => "image/svg+xml",
                        _ => throw new ArgumentException("Unsupported file extension")
                    };

                    return new GetImageResponse
                    {
                        Base64ImageData = base64Image,
                        ContentType = contentType
                    };
                }
            }
            catch (Exception e)
            {
                // Handle any exceptions
                Console.WriteLine(e.Message);
                return new GetImageResponse();
            }
        }
    }
