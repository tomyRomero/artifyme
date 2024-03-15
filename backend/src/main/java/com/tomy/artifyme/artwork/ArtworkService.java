package com.tomy.artifyme.artwork;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ArtworkService {

    private final ArtworkRepository artworkRepository;

    @SuppressWarnings("null")
public String saveArtwork(SaveArtworkRequest request) {
    try {
        // Debug print to show the received request
        System.out.println("Request received: " + request);

        // Validate request parameters
        if (!StringUtils.hasText(request.getUserEmail()) ||
                !StringUtils.hasText(request.getSketchedImage()) ||
                !StringUtils.hasText(request.getAiImage())) {
            throw new IllegalArgumentException("User email, sketched image, and AI image are required");
        }

        // Debug print to show validation success
        System.out.println("Request parameters validated successfully");

        // Create Artwork entity from the request and set creation date
        Artwork artwork = Artwork.builder()
                .userEmail(request.getUserEmail())
                .sketchedImage(request.getSketchedImage())
                .aiImage(request.getAiImage())
                .creationDateTime(LocalDateTime.now()) // Set creation date
                .build();

        // Debug print to show the created artwork
        System.out.println("Artwork created: " + artwork);

        // Save the artwork
        artworkRepository.save(artwork);

        // Debug print to indicate successful artwork save
        System.out.println("Artwork saved successfully");

        // Return success message
        return "Successful";
    } catch (Exception e) {
        // Print stack trace for debugging
        e.printStackTrace();

        // Return error message if any exception occurs
        return "Error saving artwork: " + e.getMessage();
    }
}

}
