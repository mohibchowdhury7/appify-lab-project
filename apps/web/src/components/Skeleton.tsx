import React from 'react';

// Base skeleton loader with shimmer effect
const Skeleton: React.FC<{ 
  className?: string;
  style?: React.CSSProperties;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
}> = ({ className = '', style, variant = 'text' }) => {
  const baseClasses = '_skeleton_loader';
  
  const variantClasses = {
    text: '_skeleton_text',
    circular: '_skeleton_circular',
    rectangular: '_skeleton_rectangular',
    rounded: '_skeleton_rounded',
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

// Post skeleton loader
export const PostSkeleton: React.FC = () => (
  <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16 _skeleton_post">
    <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
      <div className="_feed_inner_timeline_post_top">
        <div className="_feed_inner_timeline_post_box">
          <div className="_feed_inner_timeline_post_box_image">
            <Skeleton variant="circular" style={{ width: 40, height: 40 }} />
          </div>
          <div className="_feed_inner_timeline_post_box_txt" style={{ flex: 1 }}>
            <Skeleton variant="text" style={{ width: '60%', height: 16, marginBottom: 4 }} />
            <Skeleton variant="text" style={{ width: '40%', height: 12 }} />
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: 12 }}>
        <Skeleton variant="text" style={{ height: 16, marginBottom: 8 }} />
        <Skeleton variant="text" style={{ height: 16, width: '80%', marginBottom: 8 }} />
        <Skeleton variant="text" style={{ height: 16, width: '60%', marginBottom: 8 }} />
      </div>
      
      <div className="_feed_inner_timeline_image" style={{ marginTop: 12 }}>
        <Skeleton variant="rectangular" style={{ width: '100%', height: 300, borderRadius: 8 }} />
      </div>
      
      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26" style={{ marginTop: 12 }}>
        <Skeleton variant="text" style={{ width: 100, height: 14 }} />
      </div>
      
      <div className="_feed_inner_timeline_reaction" style={{ padding: '0 24px' }}>
        <Skeleton variant="text" style={{ width: 80, height: 36 }} />
      </div>
    </div>
  </div>
);

// Post Card Skeleton (simpler, for feed list)
export const PostCardSkeleton: React.FC = () => (
  <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
    <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
      <div className="_feed_inner_timeline_post_top">
        <div className="_feed_inner_timeline_post_box">
          <div className="_feed_inner_timeline_post_box_image">
            <Skeleton variant="circular" style={{ width: 40, height: 40 }} />
          </div>
          <div className="_feed_inner_timeline_post_box_txt" style={{ flex: 1 }}>
            <Skeleton variant="text" style={{ width: '60%', height: 16, marginBottom: 4 }} />
            <Skeleton variant="text" style={{ width: '40%', height: 12 }} />
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: 12 }}>
        <Skeleton variant="text" style={{ height: 16, marginBottom: 8 }} />
        <Skeleton variant="text" style={{ height: 16, width: '80%', marginBottom: 8 }} />
      </div>
      
      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26" style={{ marginTop: 12 }}>
        <Skeleton variant="text" style={{ width: 80, height: 14 }} />
      </div>
      
      <div className="_feed_inner_timeline_reaction" style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton variant="text" style={{ width: 60, height: 36 }} />
          <Skeleton variant="text" style={{ width: 60, height: 36 }} />
          <Skeleton variant="text" style={{ width: 60, height: 36 }} />
        </div>
      </div>
    </div>
  </div>
);

// Comment skeleton loader
export const CommentSkeleton: React.FC = () => (
  <div className="_comment_main _skeleton_comment">
    <div className="_comment_image">
      <span className="_comment_image_link">
        <Skeleton variant="circular" style={{ width: 32, height: 32 }} />
      </span>
    </div>
    <div className="_comment_area" style={{ flex: 1 }}>
      <div className="_comment_details">
        <div className="_comment_details_top">
          <div className="_comment_name">
            <Skeleton variant="text" style={{ width: 120, height: 14 }} />
          </div>
        </div>
        <div className="_comment_status" style={{ marginTop: 4 }}>
          <Skeleton variant="text" style={{ width: '80%', height: 14 }} />
          <Skeleton variant="text" style={{ width: '60%', height: 14, marginTop: 4 }} />
        </div>
      </div>
    </div>
  </div>
);

// Single line text skeleton
export const TextSkeleton: React.FC<{ width?: string | number; height?: number }> = ({ 
  width = '100%', 
  height = 16 
}) => (
  <Skeleton variant="text" style={{ width, height }} />
);

// Small loading spinner for buttons
export const ButtonLoading: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <div className="_skeleton_spinner" style={{ width: size, height: size }} />
);

export default Skeleton;
