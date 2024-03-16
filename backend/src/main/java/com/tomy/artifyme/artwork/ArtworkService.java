package com.tomy.artifyme.artwork;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ArtworkService {

    private final ArtworkRepository artworkRepository;

    @SuppressWarnings("null")
    public ResponseEntity<SaveArtworkResponse> saveArtwork(SaveArtworkRequest request) {
        try {
            // Debug print to show the received request
            System.out.println("Request received: " + request);

            // Validate request parameters
            if (!StringUtils.hasText(request.getUserEmail()) ||
                    !StringUtils.hasText(request.getSketchedImage()) ||
                    !StringUtils.hasText(request.getAiImage()) || 
                    !StringUtils.hasText(request.getTitle()) || 
                    !StringUtils.hasText(request.getDescription()))
                    {
                throw new IllegalArgumentException("User email, sketched image, AI image, description and title are required!");
            }

            // Debug print to show validation success
            System.out.println("Request parameters validated successfully");

            // Create Artwork entity from the request and set creation date
            Artwork artwork = Artwork.builder()
                    .userEmail(request.getUserEmail())
                    .sketchedImage(request.getSketchedImage())
                    .aiImage(request.getAiImage())
                    .creationDateTime(LocalDateTime.now()) // Set creation date
                    .description(request.getDescription())
                    .title(request.getTitle())
                    .build();

            // Debug print to show the created artwork
            System.out.println("Artwork created: " + artwork);

            // Save the artwork
            artworkRepository.save(artwork);

            // Debug print to indicate successful artwork save
            System.out.println("Artwork saved successfully");
            // Return success message
          
            return ResponseEntity.ok(SaveArtworkResponse.builder()
                    .message("Artwork saved successfully")
                    .id(artwork.getId())
                    .build());
        } catch (Exception e) {
            // Print stack trace for debugging
            e.printStackTrace();

           return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(SaveArtworkResponse.builder()
                .message("An unexpected error occurred")
                .id(null)
                .build());
        }
    }
    }
