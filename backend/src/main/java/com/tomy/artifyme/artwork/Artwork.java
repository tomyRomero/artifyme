package com.tomy.artifyme.artwork;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("artwork")
public class Artwork {

    @Id
    private String id;
    
    @Indexed
    private String userEmail; // Reference to user by email

    private String sketchedImage;
    private String aiImage;
    private LocalDateTime creationDateTime;
    
}
