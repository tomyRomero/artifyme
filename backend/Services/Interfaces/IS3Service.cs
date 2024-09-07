using System.Threading.Tasks;
using ArtifyMe.Models.DTOs;

namespace ArtifyMe.Services.Interfaces;

    public interface IS3Service
    {
        Task<UploadImageResponse> UploadImage(UploadImageRequest request);
        Task<GetImageResponse> GetImage(GetImageRequest request);
    }
