package com.tomy.artifyme.artwork;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ArtworkController {

    private final ArtworkService artworkService;

    public ArtworkController(ArtworkService artworkService) {
        this.artworkService = artworkService;
    }

    @PostMapping("/api/v1/artwork/save")
    public ResponseEntity<String> saveArtwork(@RequestBody SaveArtworkRequest request) {
        String message = artworkService.saveArtwork(request);
        if (message.startsWith("Successful")) {
            return ResponseEntity.status(HttpStatus.CREATED).body(message);
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(message);
        }
    }
}

