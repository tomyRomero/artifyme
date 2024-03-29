package com.tomy.artifyme.artwork;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtworkRequest {
    private String userEmail;
    private String sketchedImage;
    private String aiImage;
    private String title;
    private String description;
    private List<PathData> paths;
}
