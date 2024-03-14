package com.tomy.artifyme.s3;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class GetImageResponse {
    private String base64ImageData;
    private String contentType;
}
