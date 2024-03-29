package com.tomy.artifyme.artwork;

import org.springframework.data.domain.Page;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository; 
import org.springframework.data.domain.Pageable;

@Repository
public interface ArtworkRepository extends MongoRepository<Artwork, String> {
    
    // Query to find artwork by its ID
    @NonNull
    Optional<Artwork> findById(@NonNull String id);
    
    // Query to find all artworks belonging to a user by their email
    List<Artwork> findByUserEmail(String userEmail);
    
    // Query to find all artworks belonging to a user by their email with pagination
    Page<Artwork> findByUserEmailOrderByCreationDateTimeDesc(String userEmail, Pageable pageable);
}
