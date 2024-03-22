package com.tomy.artifyme.artwork;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;


import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.domain.Pageable;

@Service
@RequiredArgsConstructor
public class ArtworkService {

    private final ArtworkRepository artworkRepository;

    @SuppressWarnings("null")
    public ResponseEntity<ArtworkResponse> saveArtwork(ArtworkRequest request) {
        try {
            // Debug print to show the received request
            System.out.println("Request received: " + request);

            // Validate request parameters
            if (!StringUtils.hasText(request.getUserEmail()) ||
                    !StringUtils.hasText(request.getSketchedImage()) ||
                    !StringUtils.hasText(request.getAiImage()) || 
                    !StringUtils.hasText(request.getTitle()) || 
                    !StringUtils.hasText(request.getDescription()) ||
                    request.getPaths() == null || request.getPaths().isEmpty())
                    {
                throw new IllegalArgumentException("User email, sketched image, AI image, description , title and SVG paths are required!");
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
                    .paths(request.getPaths())
                    .title(request.getTitle())
                    .build();

            // Debug print to show the created artwork
            System.out.println("Artwork created: " + artwork);

            // Save the artwork
            artworkRepository.save(artwork);

            // Debug print to indicate successful artwork save
            System.out.println("Artwork saved successfully");
            // Return success message
          
            return ResponseEntity.ok(ArtworkResponse.builder()
                    .message("Artwork saved successfully")
                    .id(artwork.getId())
                    .build());
        } catch (Exception e) {
            // Print stack trace for debugging
            e.printStackTrace();

           return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ArtworkResponse.builder()
                .message("An unexpected error occurred")
                .id(null)
                .build());
        }
    }

    public ResponseEntity<PageResponse> getArtworksWithPagination(
     Integer pageNumber,
    Integer pageSize,
    String userEmail) {

        try{
            // Create a pageable object for pagination
            Pageable pageable = PageRequest.of(pageNumber - 1, pageSize);
        
            // Perform paginated query with user email filter if provided
            Page<Artwork> page;
            if (userEmail != null && !userEmail.isEmpty()) {
                page = artworkRepository.findByUserEmailOrderByCreationDateTimeDesc(userEmail, pageable);
            } else {
                page = artworkRepository.findAll(pageable);
            }
        
            // Determine if there are more pages available
            boolean isNext = page.hasNext();
        
            // Create a PageResponse object
            return ResponseEntity.ok(PageResponse.builder()
                    .message("Success getting results")
                    .isNext(isNext)
                    .content(page.getContent())
                    .build());

        }catch(Exception e)
        {
              // Print stack trace for debugging
              e.printStackTrace();

              return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(PageResponse.builder()
                   .message("An unexpected error occurred: " + e)
                   .isNext(false)
                   .content(new ArrayList<>())
                   .build());
        }
    }
    
    public ResponseEntity<Object>getArtworkById(String id) {
        try {
            if (id == null || id.isEmpty()) {
                throw new IllegalArgumentException("ID is required!");
            }

            // Fetch artwork from the repository by ID
            Optional<Artwork> artworkOptional = artworkRepository.findById(id);

            if (artworkOptional.isPresent()) {
                Artwork artwork = artworkOptional.get();
                Map<String, Object> successResponse = new HashMap<>();
                successResponse.put("artwork", artwork);
                successResponse.put("message", "Artwork found");
                // If artwork is found, return it
                return ResponseEntity.ok(successResponse);
            } else {
                // If artwork is not found, return a not found response
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("message", "Artwork not found");
                return ResponseEntity.status(404).body(errorResponse);
            }
        } catch (Exception e) {
            // Log exception for debugging
            e.printStackTrace();

            // If any other exception occurs, return an error response
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("message", "Internal Server Error: " + e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    public ResponseEntity<Object> deleteArtwork(String id) {
        try {
            // Check if ID is provided
            if (id == null || id.isEmpty()) {
                throw new IllegalArgumentException("ID is required!");
            }

            // Find the artwork by ID
            Optional<Artwork> artworkOptional = artworkRepository.findById(id);

            if (artworkOptional.isPresent()) {
                // If artwork is found, delete it
                artworkRepository.deleteById(id);

                // Return success response
                Map<String, Object> successResponse = new HashMap<>();
                successResponse.put("message", "Artwork deleted successfully");
                return ResponseEntity.ok(successResponse);
            } else {
                // If artwork is not found, return not found response
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("message", "Artwork not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }
        } catch (Exception e) {
            // Log exception for debugging
            e.printStackTrace();

            // Return error response for any exception
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("message", "Internal Server Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @SuppressWarnings("null")
    public ResponseEntity<Object> updateArtwork(String id, ArtworkRequest request) {
        try {
            // Find the artwork by its ID
            Optional<Artwork> optionalArtwork = artworkRepository.findById(id);
            if (!optionalArtwork.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ArtworkResponse.builder()
                                .message("Artwork not found")
                                .build());
            }
    
            Artwork artwork = optionalArtwork.get();
    
            // Update the artwork fields based on the request
            if (StringUtils.hasText(request.getTitle())) {
                artwork.setTitle(request.getTitle());
            }
            if (StringUtils.hasText(request.getDescription())) {
                artwork.setDescription(request.getDescription());
            }
            if (request.getSketchedImage() != null) {
                artwork.setSketchedImage(request.getSketchedImage());
            }
            if (request.getAiImage() != null) {
                artwork.setAiImage(request.getAiImage());
            }
            if (request.getPaths() != null && !request.getPaths().isEmpty()) {
                artwork.setPaths(request.getPaths());
            }
    
            // Save the updated artwork
            artworkRepository.save(artwork);
    
            // Debug print to indicate successful artwork update
            System.out.println("Artwork updated successfully: " + artwork);
    
            // Return success message
            return ResponseEntity.ok(ArtworkResponse.builder()
                    .message("Artwork updated successfully")
                    .id(artwork.getId())
                    .build());
        } catch (Exception e) {
            // Print stack trace for debugging
            e.printStackTrace();
    
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ArtworkResponse.builder()
                            .message("An unexpected error occurred")
                            .id(null)
                            .build());
        }
    }
    
    }
