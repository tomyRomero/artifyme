package com.tomy.artifyme.artwork;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveArtworkRequest {
    private String userEmail;
    private String sketchedImage;
    private String aiImage;

}
