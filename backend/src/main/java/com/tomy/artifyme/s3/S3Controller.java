package com.tomy.artifyme.s3;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/s3")
@RequiredArgsConstructor
public class S3Controller {

    private final S3Service s3Service;

    @PostMapping("/upload")
    public ResponseEntity<UploadImageResponse> uploadImage(@RequestBody UploadImageRequest request) {
        UploadImageResponse response = s3Service.uploadImage(request);
        if (response.getMessage().startsWith("Successfully")) {
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/image/{key}")
    public ResponseEntity<GetImageResponse> getImage(@PathVariable String key) {
        GetImageRequest request = GetImageRequest.builder().key(key).build();
        GetImageResponse response = s3Service.getImage(request);
        if (response.getBase64ImageData() != null) {
            return ResponseEntity.ok()
                    .body(response);
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

}
