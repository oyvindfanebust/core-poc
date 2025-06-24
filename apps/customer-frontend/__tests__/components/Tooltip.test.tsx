import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tooltip } from '../../components/Tooltip';

describe('Tooltip', () => {
  describe('Basic Rendering', () => {
    it('should render trigger element without tooltip by default', () => {
      render(
        <Tooltip content="This is a tooltip">
          <button>Hover me</button>
        </Tooltip>,
      );

      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should render tooltip content when triggered', async () => {
      render(
        <Tooltip content="This is a tooltip">
          <button>Hover me</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
      });
    });

    it('should support JSX content in tooltip', async () => {
      const content = (
        <div>
          <strong>Bold text</strong> and <em>italic text</em>
        </div>
      );

      render(
        <Tooltip content={content}>
          <button>Hover me</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('Bold text')).toBeInTheDocument();
        expect(screen.getByText('italic text')).toBeInTheDocument();
      });
    });
  });

  describe('Mouse Interactions', () => {
    it('should show tooltip on mouse enter', async () => {
      render(
        <Tooltip content="Mouse enter tooltip">
          <button>Hover me</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <Tooltip content="Mouse leave tooltip">
          <button>Hover me</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(trigger);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('should keep tooltip visible when hovering over tooltip content', async () => {
      render(
        <Tooltip content="Hoverable tooltip content">
          <button>Hover me</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      const tooltip = screen.getByRole('tooltip');
      fireEvent.mouseEnter(tooltip);
      fireEvent.mouseLeave(trigger);

      // Tooltip should remain visible
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  describe('Focus Interactions', () => {
    it('should show tooltip on focus', async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Focus tooltip">
          <button>Focus me</button>
        </Tooltip>,
      );

      await user.tab(); // Focus the button

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on blur', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <Tooltip content="Blur tooltip">
            <button>Focus me</button>
          </Tooltip>
          <button>Other button</button>
        </div>,
      );

      await user.tab(); // Focus the first button

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      await user.tab(); // Focus the second button (blur first)

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should hide tooltip when Escape key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Escape to close">
          <button>Focus me</button>
        </Tooltip>,
      );

      await user.tab(); // Focus the button

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('should not interfere with other keyboard events', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(
        <Tooltip content="Keyboard events">
          <button onClick={handleClick}>Press Enter</button>
        </Tooltip>,
      );

      await user.tab(); // Focus the button
      await user.keyboard('{Enter}'); // Trigger click

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(
        <Tooltip content="Accessible tooltip">
          <button>Accessible button</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveAttribute('id');
        expect(trigger).toHaveAttribute('aria-describedby');
        expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.getAttribute('id'));
      });
    });

    it('should remove aria-describedby when tooltip is hidden', async () => {
      render(
        <Tooltip content="ARIA cleanup">
          <button>Test button</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');

      // Show tooltip
      fireEvent.mouseEnter(trigger);
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-describedby');
      });

      // Hide tooltip
      fireEvent.mouseLeave(trigger);
      await waitFor(() => {
        expect(trigger).not.toHaveAttribute('aria-describedby');
      });
    });

    it('should be announced by screen readers', async () => {
      render(
        <Tooltip content="Screen reader content">
          <button>Button with tooltip</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveAttribute('role', 'tooltip');
        expect(tooltip).toBeInTheDocument();
      });
    });
  });

  describe('Positioning', () => {
    it('should support different placement positions', async () => {
      const { rerender } = render(
        <Tooltip content="Top placement" placement="top">
          <button>Top tooltip</button>
        </Tooltip>,
      );

      let trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('tooltip--top');
      });

      fireEvent.mouseLeave(trigger);

      rerender(
        <Tooltip content="Bottom placement" placement="bottom">
          <button>Bottom tooltip</button>
        </Tooltip>,
      );

      trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('tooltip--bottom');
      });
    });

    it('should default to top placement', async () => {
      render(
        <Tooltip content="Default placement">
          <button>Default button</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('tooltip--top');
      });
    });
  });

  describe('Delay and Timing', () => {
    it('should support custom show delay', async () => {
      jest.useFakeTimers();

      render(
        <Tooltip content="Delayed tooltip" showDelay={500}>
          <button>Delayed button</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      // Should not be visible immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should support custom hide delay', async () => {
      jest.useFakeTimers();

      render(
        <Tooltip content="Hide delayed tooltip" hideDelay={300}>
          <button>Hide delayed button</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(trigger);

      // Should still be visible
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Custom Props and Styling', () => {
    it('should support custom className on tooltip', async () => {
      render(
        <Tooltip content="Custom styled tooltip" className="custom-tooltip">
          <button>Custom button</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('custom-tooltip');
      });
    });

    it('should forward trigger props correctly', () => {
      render(
        <Tooltip content="Trigger props">
          <button data-testid="trigger-button" disabled>
            Disabled button
          </button>
        </Tooltip>,
      );

      const trigger = screen.getByTestId('trigger-button');
      expect(trigger).toBeDisabled();
    });

    it('should support controlled visibility', async () => {
      const { rerender } = render(
        <Tooltip content="Controlled tooltip" open={false}>
          <button>Controlled button</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);

      // Should not show even on hover when controlled and closed
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      rerender(
        <Tooltip content="Controlled tooltip" open={true}>
          <button>Controlled button</button>
        </Tooltip>,
      );

      // Should show when controlled and open
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });
  });
});
