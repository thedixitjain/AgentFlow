export const sampleSalesData = [
  { Date: '2024-01-15', Product: 'Laptop Pro', Category: 'Electronics', Sales: 2, Revenue: 2400, Region: 'North', Customer: 'Tech Corp' },
  { Date: '2024-01-16', Product: 'Wireless Mouse', Category: 'Electronics', Sales: 5, Revenue: 125, Region: 'South', Customer: 'Office Plus' },
  { Date: '2024-01-17', Product: 'Office Chair', Category: 'Furniture', Sales: 3, Revenue: 600, Region: 'East', Customer: 'StartupXYZ' },
  { Date: '2024-01-18', Product: 'Laptop Pro', Category: 'Electronics', Sales: 1, Revenue: 1200, Region: 'West', Customer: 'DataFlow Inc' },
  { Date: '2024-01-19', Product: 'Desk Lamp', Category: 'Furniture', Sales: 4, Revenue: 160, Region: 'North', Customer: 'Home Office Co' },
  { Date: '2024-02-01', Product: 'Monitor 27"', Category: 'Electronics', Sales: 3, Revenue: 900, Region: 'South', Customer: 'Tech Corp' },
  { Date: '2024-02-02', Product: 'Keyboard Pro', Category: 'Electronics', Sales: 6, Revenue: 360, Region: 'East', Customer: 'Office Plus' },
  { Date: '2024-02-03', Product: 'Laptop Pro', Category: 'Electronics', Sales: 2, Revenue: 2400, Region: 'West', Customer: 'CloudFirst' },
  { Date: '2024-02-05', Product: 'Standing Desk', Category: 'Furniture', Sales: 2, Revenue: 1000, Region: 'North', Customer: 'StartupXYZ' },
  { Date: '2024-02-08', Product: 'Webcam HD', Category: 'Electronics', Sales: 8, Revenue: 400, Region: 'South', Customer: 'Remote Team LLC' },
  { Date: '2024-02-10', Product: 'Office Chair', Category: 'Furniture', Sales: 4, Revenue: 800, Region: 'East', Customer: 'DataFlow Inc' },
  { Date: '2024-02-12', Product: 'Laptop Pro', Category: 'Electronics', Sales: 3, Revenue: 3600, Region: 'North', Customer: 'Enterprise Co' },
  { Date: '2024-02-15', Product: 'Monitor 27"', Category: 'Electronics', Sales: 2, Revenue: 600, Region: 'West', Customer: 'Tech Corp' },
  { Date: '2024-02-18', Product: 'Wireless Mouse', Category: 'Electronics', Sales: 10, Revenue: 250, Region: 'South', Customer: 'Office Plus' },
  { Date: '2024-02-20', Product: 'Desk Lamp', Category: 'Furniture', Sales: 6, Revenue: 240, Region: 'East', Customer: 'Home Office Co' },
  { Date: '2024-03-01', Product: 'Laptop Pro', Category: 'Electronics', Sales: 4, Revenue: 4800, Region: 'North', Customer: 'CloudFirst' },
  { Date: '2024-03-03', Product: 'Standing Desk', Category: 'Furniture', Sales: 3, Revenue: 1500, Region: 'West', Customer: 'StartupXYZ' },
  { Date: '2024-03-05', Product: 'Keyboard Pro', Category: 'Electronics', Sales: 8, Revenue: 480, Region: 'South', Customer: 'Remote Team LLC' },
  { Date: '2024-03-08', Product: 'Monitor 27"', Category: 'Electronics', Sales: 5, Revenue: 1500, Region: 'East', Customer: 'Enterprise Co' },
  { Date: '2024-03-10', Product: 'Office Chair', Category: 'Furniture', Sales: 2, Revenue: 400, Region: 'North', Customer: 'DataFlow Inc' },
]

export const sampleResearchText = `
Deep Learning Approaches for Computer Vision: A Comprehensive Survey

Abstract
This paper presents a comprehensive survey of deep learning approaches for computer vision tasks. We review the evolution of convolutional neural networks (CNNs), vision transformers, and their applications in image classification, object detection, and semantic segmentation. Our analysis covers architectural innovations, training strategies, and benchmark performance across major datasets.

1. Introduction
Computer vision has undergone a revolutionary transformation with the advent of deep learning. Traditional hand-crafted features have been largely replaced by learned representations that achieve human-level performance on many visual recognition tasks. This survey aims to provide a structured overview of the key developments in this rapidly evolving field.

The main contributions of this paper include:
- A systematic review of CNN architectures from AlexNet to modern efficient networks
- Analysis of vision transformer architectures and their advantages
- Comparison of performance across standard benchmarks
- Discussion of emerging trends and future directions

2. Methodology
Our survey methodology follows a systematic literature review approach. We searched major databases including IEEE Xplore, ACM Digital Library, and arXiv for papers published between 2012 and 2024. Selection criteria focused on peer-reviewed publications with significant citations or novel architectural contributions.

We categorized the reviewed works into three main areas:
1. Image Classification: Networks designed for categorizing images into predefined classes
2. Object Detection: Methods for localizing and classifying multiple objects in images
3. Semantic Segmentation: Approaches for pixel-level classification of image regions

3. Convolutional Neural Networks
The breakthrough of AlexNet in 2012 demonstrated the power of deep convolutional networks for image classification. Subsequent architectures like VGGNet, GoogLeNet, and ResNet introduced important innovations including deeper networks, inception modules, and residual connections.

Key findings from our analysis:
- Depth matters: Deeper networks generally achieve better performance when properly trained
- Skip connections enable training of very deep networks by addressing vanishing gradients
- Efficient architectures like MobileNet and EfficientNet achieve competitive accuracy with fewer parameters

4. Vision Transformers
The introduction of Vision Transformer (ViT) demonstrated that pure transformer architectures can achieve state-of-the-art results on image classification. Unlike CNNs, transformers process images as sequences of patches, enabling global attention from the first layer.

Important developments include:
- DeiT: Data-efficient training strategies for vision transformers
- Swin Transformer: Hierarchical vision transformer with shifted windows
- BEiT: Self-supervised pre-training for vision transformers

5. Results and Discussion
Our comparative analysis reveals several important trends:
- Vision transformers outperform CNNs on large-scale datasets when sufficient training data is available
- CNNs remain competitive and more efficient for smaller datasets and edge deployment
- Hybrid architectures combining convolutions and attention mechanisms show promising results

Performance on ImageNet classification:
- ResNet-152: 78.3% top-1 accuracy
- EfficientNet-B7: 84.4% top-1 accuracy
- ViT-Large: 87.8% top-1 accuracy
- Swin-Large: 87.3% top-1 accuracy

6. Conclusion
Deep learning has fundamentally transformed computer vision, enabling applications that were previously impossible. While CNNs dominated the field for nearly a decade, vision transformers have emerged as a powerful alternative. The future likely lies in hybrid approaches that combine the strengths of both paradigms.

Key takeaways:
- Deep learning enables end-to-end learning of visual representations
- Architecture design remains crucial for achieving optimal performance
- Pre-training on large datasets significantly improves downstream task performance
- Efficiency considerations are increasingly important for real-world deployment

References
[1] Krizhevsky, A., Sutskever, I., & Hinton, G. E. (2012). ImageNet classification with deep convolutional neural networks.
[2] He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image recognition.
[3] Dosovitskiy, A., et al. (2020). An image is worth 16x16 words: Transformers for image recognition at scale.
[4] Liu, Z., et al. (2021). Swin transformer: Hierarchical vision transformer using shifted windows.
`
